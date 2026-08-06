import { createClient } from "@/lib/supabase/server";
import { MapPin } from "lucide-react";

export default async function ViewerEventsPage() {
  const supabase = createClient();
  const { data: events } = await supabase.from("events").select("*").order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Topics / Events</h1>
      <p className="text-ink-700/60 mb-6">Monthly Bhishi meetup history.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {events?.map((ev: any) => (
          <div key={ev.id} className="card">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">{ev.month}</p>
            <h2 className="text-lg font-bold text-ink-900">{ev.topic || "Untitled Topic"}</h2>
            {ev.place && (
              <p className="text-sm text-ink-700/60 flex items-center gap-1 mt-1">
                <MapPin size={14} /> {ev.place}
              </p>
            )}
            <p className="text-sm text-ink-800/80 mt-3 whitespace-pre-line">{ev.description}</p>
          </div>
        ))}
        {(!events || events.length === 0) && <p className="text-ink-700/50 text-sm">No events added yet.</p>}
      </div>
    </div>
  );
}
