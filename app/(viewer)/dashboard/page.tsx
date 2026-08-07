"use client";

import DashboardBoard from "@/components/features/DashboardBoard";

export default function ViewerDashboard() {
  return (
    <div>
      <div className="bg-gradient-to-r from-brand-700 to-brand-500 text-white rounded-xl2 p-8 mb-8 shadow-soft">
        <h1 className="text-3xl font-bold mb-1">Welcome to the Wani Summit Portal</h1>
        <p className="text-brand-100">156 Members · 13 Winners Monthly · ₹10,000/month</p>
      </div>

      <DashboardBoard portal="viewer" />
    </div>
  );
}
