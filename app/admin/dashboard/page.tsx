import { createClient } from "@/lib/supabase/server";
import { Users, Wallet, Trophy, CalendarCheck } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = createClient();
  const [{ count: memberCount }, { count: paidCount }, { count: winnerCount }, { count: presentCount }] =
    await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }),
      supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "paid"),
      supabase.from("winners").select("*", { count: "exact", head: true }),
      supabase.from("attendance").select("*", { count: "exact", head: true }).eq("status", "present"),
    ]);

  const stats = [
    { label: "Total Members", value: memberCount ?? 0, icon: Users, color: "from-brand-500 to-brand-700" },
    { label: "Payments Received", value: paidCount ?? 0, icon: Wallet, color: "from-emerald-400 to-emerald-600" },
    { label: "Winners Declared", value: winnerCount ?? 0, icon: Trophy, color: "from-amber-400 to-amber-600" },
    { label: "Attendance Marked", value: presentCount ?? 0, icon: CalendarCheck, color: "from-indigo-400 to-indigo-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Admin Dashboard</h1>
      <p className="text-ink-700/60 mb-6">Manage attendance, payments, gallery, and winners.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>
              <s.icon size={22} />
            </div>
            <p className="text-3xl font-bold text-ink-900">{s.value}</p>
            <p className="text-sm text-ink-700/60">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
