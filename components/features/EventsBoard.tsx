"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import { Download, Plus, MapPin, Trash2, Pencil, X } from "lucide-react";

type EventRow = {
  id: number;
  month: string;
  place: string;
  topic: string;
  description: string;
  created_at: string;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, i, 1);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

export default function EventsBoard() {
  const supabase = createClient();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState({ month: MONTHS[0], place: "", topic: "", description: "" });

  async function loadEvents() {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents(data ?? []);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ month: MONTHS[0], place: "", topic: "", description: "" });
    setShowModal(true);
  }

  function openEdit(ev: EventRow) {
    setEditing(ev);
    setForm({ month: ev.month, place: ev.place ?? "", topic: ev.topic ?? "", description: ev.description ?? "" });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await supabase.from("events").update(form).eq("id", editing.id);
    } else {
      await supabase.from("events").insert(form);
    }
    setShowModal(false);
    loadEvents();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this event/topic entry?")) return;
    await supabase.from("events").delete().eq("id", id);
    loadEvents();
  }

  function downloadPDF(ev: EventRow) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Bhishi Event — ${ev.month}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Place: ${ev.place || "-"}`, 14, 26);
    doc.text(`Topic: ${ev.topic || "-"}`, 14, 34);
    const desc = doc.splitTextToSize(ev.description || "-", 180);
    doc.text(desc, 14, 44);
    doc.save(`Bhishi-Event-${ev.month.replace(" ", "-")}.pdf`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Topics / Events</h1>
          <p className="text-ink-700/60 text-sm">Record each month's Bhishi meetup — place, topic, and full story.</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {events.map((ev) => (
          <div key={ev.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">{ev.month}</p>
                <h2 className="text-lg font-bold text-ink-900">{ev.topic || "Untitled Topic"}</h2>
                {ev.place && (
                  <p className="text-sm text-ink-700/60 flex items-center gap-1 mt-1">
                    <MapPin size={14} /> {ev.place}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(ev)} className="text-brand-700"><Pencil size={16} /></button>
                <button onClick={() => handleDelete(ev.id)} className="text-rose-600"><Trash2 size={16} /></button>
              </div>
            </div>
            <p className="text-sm text-ink-800/80 mt-3 whitespace-pre-line">{ev.description}</p>
            <button onClick={() => downloadPDF(ev)} className="btn-outline mt-4 flex items-center gap-2 text-sm">
              <Download size={14} /> Download PDF
            </button>
          </div>
        ))}
        {events.length === 0 && <p className="text-ink-700/50 text-sm">No events added yet.</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl2 shadow-soft p-6 w-full max-w-lg relative">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-ink-700/50">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4">{editing ? "Edit Event" : "Add Event"}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <select className="input" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Place of Event"
                value={form.place}
                onChange={(e) => setForm({ ...form, place: e.target.value })}
              />
              <input
                className="input"
                placeholder="Topic"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
              <textarea
                className="input min-h-[120px]"
                placeholder="Full description / story of the event"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <button type="submit" className="btn-primary w-full">
                {editing ? "Save Changes" : "Add Event"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
