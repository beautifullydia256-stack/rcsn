"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";

export function GlobalSearch({ query }: { query: string }) {
  const [results, setResults] = useState<any[]>([]);
  const q = query.trim();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!q) {
        setResults([]);
        return;
      }
      const [schools, users, payments, jobs, library] = await Promise.all([
        supabase.from("schools").select("school_id,name,location").ilike("name", `%${q}%`),
        supabase.from("users").select("user_id,name,role,email").or(`name.ilike.%${q}%,email.ilike.%${q}%`),
        supabase.from("payments").select("payment_id,amount").eq("payment_id", q),
        supabase.from("jobs").select("job_id,title").ilike("title", `%${q}%`),
        supabase.from("library").select("content_id,title").ilike("title", `%${q}%`),
      ]);

      const out: any[] = [];
      if (schools.data) out.push(...schools.data.map((s) => ({ type: "School", id: s.school_id, title: s.name, subtitle: s.location, href: `/schools/${s.school_id}` })));
      if (users.data) out.push(...users.data.map((u) => ({ type: "User", id: u.user_id, title: u.name, subtitle: u.role, href: `/users/${u.user_id}` })));
      if (payments.data) out.push(...payments.data.map((p) => ({ type: "Payment", id: p.payment_id, title: p.payment_id, subtitle: `$${p.amount}`, href: `/payments/${p.payment_id}` })));
      if (jobs.data) out.push(...jobs.data.map((j) => ({ type: "Job", id: j.job_id, title: j.title, href: `/jobs/${j.job_id}` })));
      if (library.data) out.push(...library.data.map((l) => ({ type: "Library", id: l.content_id, title: l.title, href: `/library/${l.content_id}` })));

      if (!cancelled) setResults(out.slice(0, 8));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [q]);

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



