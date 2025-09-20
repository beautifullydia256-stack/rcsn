"use client";

import { useState } from "react";
import { OwnerHeader } from "./Header";
import { Kpis } from "./Kpis";
import { Charts } from "./Charts";
import { Widgets } from "./Widgets";
import { ManualPayments } from "./ManualPayments";
import { GlobalSearch } from "./GlobalSearch";
import { QuickActions } from "./QuickActions";
import { SubscriptionReport } from "./SubscriptionReport";
import { BillingLogs } from "./BillingLogs";

export default function OwnerDashboard() {
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <OwnerHeader onSearch={setSearch} />
      <GlobalSearch query={search} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Kpis />
        <QuickActions />
        <Charts />
        <Widgets />
        <ManualPayments />
        <SubscriptionReport />
        <BillingLogs />
      </div>
    </div>
  );
}
