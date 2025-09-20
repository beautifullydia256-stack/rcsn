"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";

async function fetchKpis() {
  const [schools, users, payments, jobs] = await Promise.all([
    supabase.from("schools").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("payments").select("amount,status,created_at"),
    supabase.from("jobs").select("status")
  ]);

  const totalSchools = schools.count ?? 0;
  const totalUsers = users.count ?? 0;
  const revenue = (payments.data || [])
    .filter((p: any) => p.status === "Approved")
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const pendingJobs = (jobs.data || []).filter((j: any) => j.status === "Pending").length;

  // Active vs Free plans
  const { data: plans } = await supabase
    .from("schools")
    .select("subscription_plan")
    .returns<{ subscription_plan: string }[]>();
  const activeSubs = (plans || []).filter((p) => (p.subscription_plan || "").toLowerCase() !== "free (0-20)").length;
  const freeSubs = totalSchools - activeSubs;

  return { totalSchools, totalUsers, revenue, pendingJobs, activeSubs, freeSubs };
}

export function Kpis() {
  const { data, isLoading } = useQuery({ queryKey: ["owner-kpis"], queryFn: fetchKpis });

  const skeleton = (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 animate-pulse" />
      ))}
    </div>
  );

  if (isLoading || !data) return skeleton;

  const cards = [
    { label: "Total Schools", value: data.totalSchools, accent: "from-blue-500/30 to-blue-700/20" },
    { label: "Active Subs", value: data.activeSubs, accent: "from-green-500/30 to-green-700/20" },
    { label: "Free Subs", value: data.freeSubs, accent: "from-yellow-500/30 to-yellow-700/20" },
    { label: "Total Users", value: data.totalUsers, accent: "from-red-500/30 to-red-700/20" },
    { label: "Revenue", value: new Intl.NumberFormat().format(data.revenue), accent: "from-indigo-500/30 to-indigo-700/20" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c, idx) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          whileHover={{ scale: 1.03 }}
          className={`rounded-xl border border-white/10 bg-gradient-to-br ${c.accent} bg-white/10 backdrop-blur-md p-4 shadow-lg shadow-black/20 transition-transform`}
        >
          <div className="text-xs text-white/80">{c.label}</div>
          <div className="text-2xl font-semibold mt-1 text-white">{c.value}</div>
        </motion.div>
      ))}
    </div>
  );
}



