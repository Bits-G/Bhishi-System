"use client";

import DashboardBoard from "@/components/features/DashboardBoard";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Admin Dashboard</h1>
      <p className="text-ink-700/60 mb-6">Manage attendance, payments, gallery, and winners. Click any card below to view details.</p>

      <DashboardBoard portal="admin" />
    </div>
  );
}
