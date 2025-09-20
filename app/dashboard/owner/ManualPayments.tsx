"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";

interface PaymentRow {
  payment_id: string;
  amount: number;
  created_at: string;
  status?: "Pending" | "Approved" | "Rejected";
}

export function ManualPayments() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase
        .from("payments")
        .select("payment_id,amount,created_at,status")
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data as PaymentRow[]) || []);
      setLoading(false);
    };
    run();
  }, []);

  const updateStatus = async (id: string, status: "Approved" | "Rejected") => {
    await supabase.from("payments").update({ status }).eq("payment_id", id);
    setRows((prev) => prev.map((r) => (r.payment_id === id ? { ...r, status } : r)));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.01 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="text-sm font-medium text-white">Manual Payments</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2 text-white/80">Transaction ID</th>
              <th className="px-4 py-2 text-white/80">Amount</th>
              <th className="px-4 py-2 text-white/80">Date</th>
              <th className="px-4 py-2 text-white/80">Status</th>
              <th className="px-4 py-2 text-white/80">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-white/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-white/80">Loading...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-white/80">No payments found.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.payment_id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs text-white">{r.payment_id}</td>
                  <td className="px-4 py-2 text-white">{new Intl.NumberFormat().format(r.amount)}</td>
                  <td className="px-4 py-2 text-white/90">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-white">{r.status || "Pending"}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button className="px-2 py-1 text-xs rounded bg-green-500 hover:bg-green-400 transition-transform hover:scale-105 text-white" onClick={() => updateStatus(r.payment_id, "Approved")}>Approve</button>
                    <button className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-400 transition-transform hover:scale-105 text-white" onClick={() => updateStatus(r.payment_id, "Rejected")}>Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}



