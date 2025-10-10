"use client";

import { useState } from "react";
import { AdminHeader } from "./Header";
import { AdminKpis } from "./Kpis";
import { AdminCharts } from "./Charts";
import { AdminWidgets } from "./Widgets";
import { AdminQuickActions } from "./QuickActions";
import { AdminGlobalSearch } from "./GlobalSearch";
import { PendingExpenses } from "./PendingExpenses";

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<{ role?: string; class?: string; status?: string }>({});

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <AdminHeader onSearch={setSearch} onFilter={setFilters} />
      <AdminGlobalSearch query={search} filters={filters} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <AdminKpis />
        <AdminQuickActions />
        <PendingExpenses />
        <AdminCharts />
        <AdminWidgets />
      </div>
    </div>
  );
}
