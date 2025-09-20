"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";

export function SubscriptionReport() {
  const [rows, setRows] = useState<{ plan: string; schools: number }[]>([]);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.from("schools").select("subscription_plan");
      const group: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const k = r.subscription_plan || "Free (0-20)";
        group[k] = (group[k] || 0) + 1;
      });
      setRows(Object.entries(group).map(([plan, schools]) => ({ plan, schools })));
    };
    run();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.01 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="text-sm font-medium text-white">Subscription Report</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2 text-white/80">Plan</th>
              <th className="px-4 py-2 text-white/80">Schools</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-white/5">
            {rows.map((r) => (
              <tr key={r.plan} className="border-t border-white/10">
                <td className="px-4 py-2 text-white">{r.plan}</td>
                <td className="px-4 py-2 text-white">{r.schools}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

