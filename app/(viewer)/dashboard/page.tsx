import { createClient } from "@/lib/supabase/server";
import { Users, Wallet, Trophy, ShieldCheck } from "lucide-react";

export default async function ViewerDashboard() {
  const supabase = createClient();
  const [{ count: memberCount }, { count: paidCount }, { count: winnerCount }] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("winners").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div>
      <div className="bg-gradient-to-r from-brand-700 to-brand-500 text-white rounded-xl2 p-8 mb-8 shadow-soft">
        <h1 className="text-3xl font-bold mb-1">Welcome to the Bhishi Portal</h1>
        <p className="text-brand-100">144 Members · 12 Month Lucky Draw · ₹10,000/month</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="card">
          <Users className="text-brand-600 mb-2" size={26} />
          <p className="text-3xl font-bold">{memberCount ?? 0}</p>
          <p className="text-sm text-ink-700/60">Total Members</p>
        </div>
        <div className="card">
          <Wallet className="text-emerald-600 mb-2" size={26} />
          <p className="text-3xl font-bold">{paidCount ?? 0}</p>
          <p className="text-sm text-ink-700/60">Payments Received</p>
        </div>
        <div className="card">
          <Trophy className="text-amber-500 mb-2" size={26} />
          <p className="text-3xl font-bold">{winnerCount ?? 0}</p>
          <p className="text-sm text-ink-700/60">Winners Declared</p>
        </div>
      </div>

      <p className="text-sm text-ink-700/50 flex items-center gap-2">
        <ShieldCheck size={16} /> This is a live public view — data reflects the latest updates made by the Bhishi admin team.
      </p>
    </div>
  );
}
