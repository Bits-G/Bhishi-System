"use client";

import DashboardBoard from "@/components/features/DashboardBoard";

export default function MasterAdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Master Admin Dashboard</h1>
      <p className="text-ink-700/60 mb-6">Full control over admins, members, and all Wani Summit data. Click any card below to view details.</p>

      <DashboardBoard portal="master-admin" />

      <div className="mt-8 card">
        <h2 className="font-semibold text-lg mb-2">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/master-admin/admins" className="btn-primary">Manage Admins</a>
          <a href="/master-admin/members" className="btn-outline">Import Members (CSV)</a>
          <a href="/master-admin/winners" className="btn-outline">Run Lucky Draw</a>
        </div>
      </div>
    </div>
  );
}
