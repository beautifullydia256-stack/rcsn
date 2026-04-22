"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  resolveDisciplineDisplayStatus,
  type DisciplineDisplayStatus,
} from "@/src/components/admin/students/StudentDisciplineSection";

const FILTER_LABELS: Record<string, string> = {
  all: "All Students",
  active: "Active Students",
  warned: "Warned Students",
  suspended: "Suspended Students",
  deactivated: "Deactivated Students",
  deleted: "Deleted Students",
};

function rowDisciplineStatus(
  r: {
    deleted_at?: string | null;
    discipline_deactivated_at?: string | null;
    suspension_open?: boolean | null;
  },
  hasWarning: boolean
): DisciplineDisplayStatus {
  return resolveDisciplineDisplayStatus(r, hasWarning);
}

function clientDisciplineFilter(
  list: any[],
  filter: string,
  warnIds: Set<string>
): any[] {
  const f = (filter || "all").toLowerCase();
  if (f === "all") return list;
  return list.filter((r) => {
    const st = rowDisciplineStatus(r, warnIds.has(r.student_id));
    if (f === "active") return st === "Active";
    if (f === "warned") return st === "Warned";
    if (f === "suspended") return st === "Suspended";
    if (f === "deactivated") return st === "Deactivated";
    if (f === "deleted") return st === "Deleted";
    return true;
  });
}

function StudentsListPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const discipline = (searchParams.get("discipline") || "all").toLowerCase();

  const [rows, setRows] = useState<any[]>([]);
  const [schoolType, setSchoolType] = useState<"Nursery/Primary" | "Secondary" | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [klass, setKlass] = useState("");
  const [loading, setLoading] = useState(true);
  const [warningIds, setWarningIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: me } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!me?.school_id) {
        router.push("/login");
        return;
      }
      setSchoolId(me.school_id);
      const { data: sch } = await supabase.from("schools").select("type").eq("school_id", me.school_id).single();
      setSchoolType((sch?.type as any) || null);

      const { data: warnRows } = await supabase
        .from("discipline_records")
        .select("student_id")
        .eq("school_id", me.school_id)
        .eq("action_type", "warning");
      const wSet = new Set(
        (warnRows || []).map((w: { student_id: string }) => w.student_id).filter(Boolean)
      );
      setWarningIds(wSet);

      const { data: canD } = await supabase.rpc("current_user_can_manage_discipline");
      let studs: any[] | undefined;
      if (canD) {
        const { data: rpcRows, error: rpcErr } = await supabase.rpc("admin_list_students_discipline_filtered", {
          p_filter: discipline,
        });
        if (!rpcErr && rpcRows) {
          studs = rpcRows as any[];
        }
      }
      if (!studs) {
        const { data: all } = await supabase
          .from("students")
          .select("*")
          .eq("school_id", me.school_id)
          .order("created_at", { ascending: false });
        studs = clientDisciplineFilter(all || [], discipline, wSet);
      }

      setRows(studs);
    } finally {
      setLoading(false);
    }
  }, [router, discipline]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let out = rows;
    if (t) {
      out = out.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(t) || (r.current_class || "").toLowerCase().includes(t)
      );
    }
    if (klass) {
      out = out.filter((r) => (r.current_class || "") === klass);
    }
    return out;
  }, [q, klass, rows]);

  const remove = async (id: string, admission_number: string) => {
    if (
      !confirm(
        "Permanently delete this student? This removes their login and related data. For school discipline, prefer Archive on the student profile."
      )
    )
      return;

    try {
      const response = await fetch("/api/admin/delete-student", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: id,
          admission_number: admission_number,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to delete student: ${errorData.error}`);
        return;
      }

      setRows((prev) => prev.filter((r) => r.student_id !== id));
      alert("Student and all related data deleted successfully");
    } catch (error: any) {
      alert(`Failed to delete student: ${error.message}`);
    }
  };

  const banner = FILTER_LABELS[discipline] || FILTER_LABELS.all;

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-white text-xl font-semibold">Students</h1>
          <button
            className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
            onClick={() => router.push("/dashboard/admin")}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mb-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85">
          Showing: <span className="font-medium text-white">{banner}</span>
          {schoolId && (
            <button
              type="button"
              className="ml-3 text-violet-300 hover:text-violet-200 underline text-xs"
              onClick={() => load()}
            >
              Refresh
            </button>
          )}
        </div>

        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
          <input
            className="w-full md:w-1/2 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by name or class"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="w-full md:w-64 rounded-xl border border-white/10 bg-white text-black px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={klass}
            onChange={(e) => setKlass(e.target.value)}
          >
            <option value="">All Classes</option>
            {schoolType === "Nursery/Primary" && (
              <>
                <option value="Baby Class">Baby Class</option>
                <option value="Middle Class">Middle Class</option>
                <option value="Top Class">Top Class</option>
                {Array.from({ length: 7 }).map((_, i) => (
                  <option key={`P-${i}`} value={`Primary ${i + 1}`}>{`Primary ${i + 1}`}</option>
                ))}
              </>
            )}
            {schoolType === "Secondary" && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <option key={`S-${i}`} value={`Senior ${i + 1}`}>{`Senior ${i + 1}`}</option>
                ))}
              </>
            )}
          </select>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto"
        >
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2 text-white/80">Name</th>
                <th className="px-4 py-2 text-white/80">Class</th>
                <th className="px-4 py-2 text-white/80">Discipline status</th>
                <th className="px-4 py-2 text-white/80">Enrollment</th>
                <th className="px-4 py-2 text-white/80">Enrolled</th>
                <th className="px-4 py-2 text-white/80">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-white/80">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-white/80">
                    No students found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const dStatus = rowDisciplineStatus(r, warningIds.has(r.student_id));
                  return (
                    <tr key={r.student_id} className="border-t border-white/10">
                      <td className="px-4 py-2 text-white">
                        <a
                          className="underline-offset-4 hover:underline"
                          href={`/dashboard/admin/students/${r.student_id}`}
                        >
                          {r.name}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-white/90">{r.current_class}</td>
                      <td className="px-4 py-2 text-white/90">
                        <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs">
                          {dStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-white/90">{r.status || "—"}</td>
                      <td className="px-4 py-2 text-white/90">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 transition-transform hover:scale-105 text-white"
                            onClick={() => router.push(`/dashboard/admin/students/${r.student_id}`)}
                          >
                            View
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded bg-violet-600 hover:bg-violet-500 transition-transform hover:scale-105 text-white"
                            onClick={() =>
                              router.push(`/dashboard/admin/students/${r.student_id}#discipline`)
                            }
                          >
                            Discipline
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-400 transition-transform hover:scale-105 text-white"
                            onClick={() => remove(r.student_id, r.admission_number)}
                          >
                            Hard delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}

export default function StudentsListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">
          Loading students…
        </div>
      }
    >
      <StudentsListPageInner />
    </Suspense>
  );
}
