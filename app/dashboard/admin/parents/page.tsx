"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus, Search, Users, Trash2, Mail, Phone, GraduationCap, User } from "lucide-react";
import { loadOutstandingBalanceAggByStudent } from "@/src/lib/adminFinanceTerm";

type ParentLink = {
  parent_id: string;
  student_id: string;
  user_id?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  student_name?: string;
  student_class?: string;
};

type ParentGroup = {
  parent_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  user_id?: string | null;
  links: ParentLink[];
  childCount: number;
  totalOutstanding: number;
  /** True if any linked child has balance > 0 */
  hasOutstanding: boolean;
  missingContact: boolean;
};

const FILTER_LABELS: Record<string, string> = {
  all: "All Parents",
  outstanding: "Parents with outstanding balances",
  missing_contact: "Parents with missing contact information",
};

function missingContact(email: string | null | undefined, phone: string | null | undefined): boolean {
  const e = (email || "").trim();
  const p = (phone || "").trim();
  return !p || !e;
}

function ParentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = (searchParams.get("filter") || "all").toLowerCase();

  const [flatLinks, setFlatLinks] = useState<ParentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

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

      const { data: userData } = await supabase
        .from("users")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!userData?.school_id) {
        router.push("/login");
        return;
      }

      const { data: parentsData, error } = await supabase
        .from("parents")
        .select(
          `
          parent_id,
          student_id,
          user_id,
          name,
          email,
          phone,
          created_at,
          students (
            name,
            current_class
          )
        `
        )
        .eq("school_id", userData.school_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading parents:", error);
        setFlatLinks([]);
        return;
      }

      const formatted: ParentLink[] = (parentsData || []).map((p: any) => ({
        parent_id: p.parent_id,
        student_id: p.student_id,
        user_id: p.user_id,
        name: p.name || "",
        email: p.email,
        phone: p.phone,
        created_at: p.created_at,
        student_name: p.students?.name || "Unknown",
        student_class: p.students?.current_class || "N/A",
      }));
      setFlatLinks(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const [balanceByStudent, setBalanceByStudent] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!userData?.school_id) return;
      const agg = await loadOutstandingBalanceAggByStudent(supabase, userData.school_id);
      const m = new Map<string, number>();
      agg.forEach((v, sid) => m.set(sid, v.balance));
      setBalanceByStudent(m);
    };
    run();
  }, [flatLinks.length]);

  const groups = useMemo((): ParentGroup[] => {
    const byParent = new Map<string, ParentGroup>();
    for (const link of flatLinks) {
      const bal = balanceByStudent.get(link.student_id) ?? 0;
      let g = byParent.get(link.parent_id);
      if (!g) {
        g = {
          parent_id: link.parent_id,
          name: link.name,
          email: link.email,
          phone: link.phone,
          user_id: link.user_id,
          links: [],
          childCount: 0,
          totalOutstanding: 0,
          hasOutstanding: false,
          missingContact: missingContact(link.email, link.phone),
        };
        byParent.set(link.parent_id, g);
      }
      g.links.push(link);
      g.childCount = g.links.length;
      g.totalOutstanding += Math.max(0, bal);
      if (bal > 0) g.hasOutstanding = true;
      if (link.name?.trim()) g.name = link.name;
      if (!g.email?.trim() && link.email?.trim()) g.email = link.email;
      if (!g.phone?.trim() && link.phone?.trim()) g.phone = link.phone;
      if (link.user_id) g.user_id = link.user_id;
      g.missingContact = missingContact(g.email, g.phone);
    }
    return Array.from(byParent.values());
  }, [flatLinks, balanceByStudent]);

  const filterBanner = FILTER_LABELS[filter] || FILTER_LABELS.all;

  const filteredGroups = useMemo(() => {
    let g = groups;
    if (filter === "outstanding") {
      g = g.filter((x) => x.hasOutstanding);
    } else if (filter === "missing_contact") {
      g = g.filter((x) => x.missingContact);
    }

    if (!searchQuery.trim()) return g;
    const q = searchQuery.toLowerCase();
    return g.filter(
      (pg) =>
        pg.name?.toLowerCase().includes(q) ||
        (pg.email || "").toLowerCase().includes(q) ||
        (pg.phone || "").includes(searchQuery) ||
        pg.links.some(
          (l) =>
            (l.student_name || "").toLowerCase().includes(q) ||
            (l.student_class || "").toLowerCase().includes(q)
        )
    );
  }, [groups, filter, searchQuery]);

  const handleDeleteLink = async (parentId: string, studentId: string, parentName: string) => {
    if (!confirm(`Remove ${parentName} link for this student? This will not delete their login if they have one.`)) {
      return;
    }

    const delKey = `${parentId}::${studentId}`;
    setDeleting(delKey);
    try {
      const { error } = await supabase.from("parents").delete().eq("parent_id", parentId).eq("student_id", studentId);

      if (error) throw error;

      setFlatLinks((prev) => prev.filter((p) => !(p.parent_id === parentId && p.student_id === studentId)));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-white/70 text-sm">Loading parents...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Parents & Guardians</h1>
          <p className="text-white/70 text-sm mt-1">Manage parent accounts and their linked students</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/admin/parents/add")}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Parent
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85">
        Showing: <span className="font-medium text-white">{filterBanner}</span>
        <button type="button" className="ml-3 text-violet-300 hover:text-violet-200 underline text-xs" onClick={() => load()}>
          Refresh
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-blue-400/20 bg-blue-500/10 backdrop-blur-md p-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Parent contacts (grouped)</p>
            <p className="text-2xl font-bold text-white">{groups.length}</p>
          </div>
        </div>
      </motion.div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Search by name, email, phone, or student…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden"
      >
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-white/70 font-medium mb-1">No parents found</h3>
            <p className="text-white/50 text-sm mb-4">
              {searchQuery ? "Try adjusting your search" : "Try another filter or add a parent"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-white/60">
                  <th className="px-4 py-3 font-medium">Parent</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Children</th>
                  <th className="px-4 py-3 font-medium">Total outstanding</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredGroups.map((pg) => (
                  <tr key={pg.parent_id} className="text-white/90 align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {pg.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="font-medium text-white flex items-center gap-2 flex-wrap">
                            {pg.name || "Unnamed"}
                            {pg.user_id && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-300 border border-green-400/30">
                                <User className="w-3 h-3" />
                                Login
                              </span>
                            )}
                          </div>
                          {pg.missingContact && (
                            <p className="text-amber-300/90 text-xs mt-0.5">Missing phone or email</p>
                          )}
                          <ul className="mt-2 space-y-1 text-xs text-white/55">
                            {pg.links.map((l) => (
                              <li key={l.student_id} className="flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                {l.student_name}{" "}
                                <span className="text-white/40">({l.student_class})</span>
                                {balanceByStudent.get(l.student_id) ? (
                                  <span className="text-amber-200/80">
                                    · bal {Number(balanceByStudent.get(l.student_id)).toLocaleString()}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/80">{pg.phone?.trim() || "—"}</td>
                    <td className="px-4 py-3 text-white/80">{pg.email?.trim() || "—"}</td>
                    <td className="px-4 py-3">{pg.childCount}</td>
                    <td className="px-4 py-3">
                      {pg.totalOutstanding > 0 ? (
                        <span className="text-amber-200 font-medium">
                          {pg.totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {pg.links.map((l) => {
                          const dk = `${pg.parent_id}::${l.student_id}`;
                          return (
                            <button
                              key={l.student_id}
                              type="button"
                              onClick={() => handleDeleteLink(pg.parent_id, l.student_id, pg.name)}
                              disabled={deleting === dk}
                              className="text-left text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                            >
                              {deleting === dk ? "Removing…" : `Remove link (${l.student_name})`}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {filteredGroups.length > 0 && (
        <p className="text-center text-white/40 text-sm mt-4">
          Showing {filteredGroups.length} of {groups.length} parent contacts
        </p>
      )}
    </>
  );
}

export default function ParentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-white/80">Loading…</div>
      }
    >
      <ParentsPageInner />
    </Suspense>
  );
}
