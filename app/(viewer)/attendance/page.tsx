import { createClient } from "@/lib/supabase/server";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, i, 1);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

export default async function ViewerAttendancePage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const supabase = createClient();
  const activeIndex = searchParams.month ? Number(searchParams.month) : 0;
  const monthKey = MONTHS[activeIndex] ?? MONTHS[0];

  const { data: members } = await supabase.from("members").select("id, member_name, alot_number").order("alot_number");
  const { data: attendance } = await supabase.from("attendance").select("*").eq("month", monthKey);

  const attMap: Record<number, string> = {};
  (attendance ?? []).forEach((a: any) => (attMap[a.member_id] = a.status));

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Attendance — {monthKey}</h1>
      <p className="text-ink-700/60 mb-4">Live attendance record for this Bhishi group.</p>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        {MONTHS.map((m, i) => (
          <a
            key={m}
            href={`/attendance?month=${i}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              i === activeIndex ? "bg-brand-700 text-white shadow-soft" : "bg-white text-ink-700 border border-brand-100"
            }`}
          >
            Month {i + 1}
          </a>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-800 border-b border-brand-100">
              <th className="py-2 pr-4">Alot No.</th>
              <th className="py-2 pr-4">Member Name</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {members?.map((m) => {
              const status = attMap[m.id] ?? "absent";
              return (
                <tr key={m.id} className="border-b border-brand-50">
                  <td className="py-2 pr-4">{m.alot_number}</td>
                  <td className="py-2 pr-4 font-medium">{m.member_name}</td>
                  <td className="py-2 pr-4">
                    <span className={status === "present" ? "badge-paid" : "badge-unpaid"}>{status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
