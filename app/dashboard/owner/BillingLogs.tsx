"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";

interface BillingRow {
  payment_id: string;
  amount: number;
  created_at: string;
  status?: string;
}

export function BillingLogs() {
  const [rows, setRows] = useState<BillingRow[]>([]);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase
        .from("payments")
        .select("payment_id, amount, created_at, status")
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data as BillingRow[]) || []);
    };
    run();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.01 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="text-sm font-medium text-white">Billing Logs</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2 text-white/80">Transaction ID</th>
              <th className="px-4 py-2 text-white/80">Amount</th>
              <th className="px-4 py-2 text-white/80">Date</th>
              <th className="px-4 py-2 text-white/80">Status</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-white/5">
            {rows.map((r) => (
              <tr key={r.payment_id} className="border-t border-white/10">
                <td className="px-4 py-2 font-mono text-xs text-white">{r.payment_id}</td>
                <td className="px-4 py-2 text-white">{new Intl.NumberFormat().format(r.amount)}</td>
                <td className="px-4 py-2 text-white/90">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-white">{r.status || "Pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

