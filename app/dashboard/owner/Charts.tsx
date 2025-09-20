"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  HeatMap,
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#9333ea", "#ef4444"];

export function Charts() {
  const [growth, setGrowth] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [usage, setUsage] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      // Schools per month
      const { data: schools } = await supabase.rpc("schools_per_month");
      // Fallback if RPC not present
      if (schools) setGrowth(schools as any[]);

      // Plan distribution
      const { data: planRows } = await supabase.from("schools").select("subscription_plan");
      const grouped: Record<string, number> = {};
      (planRows || []).forEach((r: any) => {
        const key = r.subscription_plan || "Free (0-20)";
        grouped[key] = (grouped[key] || 0) + 1;
      });
      setPlans(Object.entries(grouped).map(([name, value]) => ({ name, value })));

      // Usage heatmap (daily logins)
      const { data: logs } = await supabase.from("logs").select("created_at");
      const byDay: Record<string, number> = {};
      (logs || []).forEach((l: any) => {
        const d = new Date(l.created_at).toISOString().slice(0, 10);
        byDay[d] = (byDay[d] || 0) + 1;
      });
      setUsage(Object.entries(byDay).map(([date, count]) => ({ date, count })));
    };
    run();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-purple-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm text-white/90 mb-2">Schools Growth</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growth} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-teal-500/20 to-teal-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm text-white/90 mb-2">Subscription Plans</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={plans} dataKey="value" nameKey="name" outerRadius={80} label>
                {plans.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileHover={{ scale: 1.02 }} className="rounded-xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-orange-700/10 bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20">
        <div className="text-sm text-white/90 mb-2">System Usage (Daily Logins)</div>
        <div className="h-64 overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usage} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}



