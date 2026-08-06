import { createClient } from "@/lib/supabase/server";

export default async function ViewerMembersPage() {
  const supabase = createClient();
  const { data: members } = await supabase.from("members").select("*").order("alot_number");

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Members Directory</h1>
      <p className="text-ink-700/60 mb-6">{members?.length ?? 0} members in this Bhishi group</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members?.map((m) => (
          <div key={m.id} className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                {m.member_name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-ink-900">{m.member_name}</p>
                <p className="text-xs text-ink-700/60">Alot No: {m.alot_number} · {m.district}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
