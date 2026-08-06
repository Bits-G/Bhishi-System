import { createClient } from "@/lib/supabase/server";
import { Trophy } from "lucide-react";

export default async function ViewerWinnersPage() {
  const supabase = createClient();
  const { data: winners } = await supabase
    .from("winners")
    .select("id, month, business_designation, members(member_name, alot_number)")
    .order("won_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1 flex items-center gap-2">
        <Trophy className="text-amber-500" /> Winners of the Month
      </h1>
      <p className="text-ink-700/60 mb-6">All lucky draw winners so far — each member wins only once.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {winners?.map((w: any) => (
          <div key={w.id} className="card border-amber-200 bg-amber-50/40">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">{w.month}</p>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={18} className="text-amber-500" />
              <p className="font-bold text-ink-900">{w.members?.member_name}</p>
            </div>
            <p className="text-sm text-ink-700/70">Alot No: {w.members?.alot_number}</p>
            {w.business_designation && <p className="text-sm text-brand-800 mt-1">{w.business_designation}</p>}
          </div>
        ))}
        {(!winners || winners.length === 0) && <p className="text-ink-700/50 text-sm">No winners declared yet.</p>}
      </div>
    </div>
  );
}
