"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";

export function AdminGlobalSearch({ query, filters }: { query: string; filters: { role?: string; class?: string; status?: string } }) {
  const [results, setResults] = useState<any[]>([]);
  const q = query.trim();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!q) {
        setResults([]);
        return;
      }

      const [students, teachers, parents, payments, reports] = await Promise.all([
        supabase.from("students").select("student_id,name,current_class").ilike("name", `%${q}%`),
        supabase.from("teachers").select("teacher_id,name,email").ilike("name", `%${q}%`),
        supabase.from("parents").select("parent_id,name,email,student_id").ilike("name", `%${q}%`),
        supabase.from("payments").select("payment_id,amount").eq("payment_id", q),
        supabase.from("reports").select("report_id,student_id,template_name").ilike("template_name", `%${q}%`),
      ]);

      let out: any[] = [];
      if (students.data) out.push(...students.data.map((s) => ({ type: "Student", id: s.student_id, title: s.name, subtitle: s.current_class, href: `/students/${s.student_id}` })));
      if (teachers.data) out.push(...teachers.data.map((t) => ({ type: "Teacher", id: t.teacher_id, title: t.name, subtitle: t.email, href: `/teachers/${t.teacher_id}` })));
      if (parents.data) out.push(...parents.data.map((p) => ({ type: "Parent", id: p.parent_id, title: p.name, subtitle: p.email, href: `/parents/${p.parent_id}` })));
      if (payments.data) out.push(...payments.data.map((p) => ({ type: "Payment", id: p.payment_id, title: p.payment_id, subtitle: `$${p.amount}`, href: `/payments/${p.payment_id}` })));
      if (reports.data) out.push(...reports.data.map((r) => ({ type: "Report", id: r.report_id, title: r.template_name, href: `/reports/${r.report_id}` })));

      // Simple client-side filtering based on provided filters
      if (filters.role) out = out.filter((x) => x.type.toLowerCase() === filters.role);
      if (filters.class) out = out.filter((x) => x.subtitle?.includes(filters.class));
      if (filters.status) out = out.filter((x) => x.subtitle?.includes(filters.status));

      if (!cancelled) setResults(out.slice(0, 8));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [q, filters]);

  if (!q || results.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border border-white/10 rounded-xl bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-3">
        <div className="text-xs text-white/80 mb-2">Search results</div>
        <div className="grid md:grid-cols-2 gap-2">
          {results.map((r) => (
            <a key={`${r.type}-${r.id}`} href={r.href} className="flex items-center justify-between rounded-lg border border-white/10 hover:border-blue-300/50 p-2 transition-transform hover:scale-105">
              <div>
                <div className="text-sm font-medium text-white">{r.title}</div>
                {r.subtitle ? <div className="text-xs text-white/80">{r.subtitle}</div> : null}
              </div>
              <div className="text-xs text-white/70">{r.type}</div>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}



