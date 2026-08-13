"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import { createPdfDoc } from "@/lib/pdf/createDoc";
import {
  Download, Plus, MapPin, Trash2, Pencil, X, Folder, ArrowLeft, Upload,
  FileText, Image as ImageIcon, Video, Paperclip,
} from "lucide-react";

type EventRow = {
  id: number;
  month: string;
  place: string;
  topic: string;
  description: string;
  attachment_url?: string | null;
  attachment_type?: "photo" | "video" | "pdf" | null;
  attachment_public_id?: string | null;
  created_at: string;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 7 + i, 1); // Aug 2026 -> July 2027
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function EventsBoard({ canManage = false }: { canManage?: boolean }) {
  const supabase = createClient();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState({ place: "", topic: "", description: "" });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);

  async function loadEvents() {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setEvents(data ?? []);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  function countForMonth(m: string) {
    return events.filter((e) => e.month === m).length;
  }

  function openNew() {
    setEditing(null);
    setForm({ place: "", topic: "", description: "" });
    setAttachmentFile(null);
    setRemoveExistingAttachment(false);
    setShowModal(true);
  }

  function openEdit(ev: EventRow) {
    setEditing(ev);
    setForm({ place: ev.place ?? "", topic: ev.topic ?? "", description: ev.description ?? "" });
    setAttachmentFile(null);
    setRemoveExistingAttachment(false);
    setShowModal(true);
  }

  async function uploadAttachment(file: File): Promise<{ url: string; type: "photo" | "video" | "pdf"; public_id: string } | null> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert("Cloudinary is not configured yet. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local");
      return null;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    // "auto" lets Cloudinary route images/videos/PDFs correctly without us guessing
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error?.message ?? "Attachment upload failed");
      return null;
    }
    let type: "photo" | "video" | "pdf" = "photo";
    if (file.type.startsWith("video")) type = "video";
    else if (file.type === "application/pdf") type = "pdf";
    return { url: data.secure_url, type, public_id: data.public_id };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!openMonth) return;
    setUploading(true);

    let attachmentFields: Partial<EventRow> = {};
    if (attachmentFile) {
      const uploaded = await uploadAttachment(attachmentFile);
      if (!uploaded) {
        setUploading(false);
        return;
      }
      attachmentFields = { attachment_url: uploaded.url, attachment_type: uploaded.type, attachment_public_id: uploaded.public_id };
    } else if (removeExistingAttachment) {
      attachmentFields = { attachment_url: null, attachment_type: null, attachment_public_id: null };
    }

    const payload = { ...form, month: openMonth, ...attachmentFields };

    if (editing) {
      await supabase.from("events").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("events").insert(payload);
    }
    setUploading(false);
    setShowModal(false);
    loadEvents();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this event/topic entry?")) return;
    await supabase.from("events").delete().eq("id", id);
    loadEvents();
  }

  async function downloadPDF(ev: EventRow) {
    const doc = await createPdfDoc();
    doc.setFontSize(16);
    doc.text(`Wani Summit Event — ${ev.month}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Place: ${ev.place || "-"}`, 14, 26);
    doc.text(`Topic: ${ev.topic || "-"}`, 14, 34);
    const desc = doc.splitTextToSize(ev.description || "-", 180);
    doc.text(desc, 14, 44);
    doc.save(`WaniSummit-Event-${ev.month.replace(" ", "-")}.pdf`);
  }

  const monthEvents = openMonth ? events.filter((e) => e.month === openMonth) : [];

  // ---------- FOLDER (root) VIEW ----------
  if (!openMonth) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-ink-900 mb-1">Topics / Events</h1>
        <p className="text-ink-700/60 mb-6">Pick a month to view that month's Wani Summit meetup.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => setOpenMonth(m)}
              className="card text-left hover:shadow-soft transition flex flex-col items-start gap-2"
            >
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
                <Folder size={22} />
              </div>
              <p className="font-semibold text-ink-900">{m}</p>
              <p className="text-xs text-ink-700/50">{countForMonth(m)} event{countForMonth(m) === 1 ? "" : "s"}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- INSIDE A MONTH FOLDER ----------
  return (
    <div>
      <button
        onClick={() => setOpenMonth(null)}
        className="text-brand-700 text-sm font-medium flex items-center gap-1 mb-4 hover:underline"
      >
        <ArrowLeft size={16} /> Back to all months
      </button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Topics / Events — {openMonth}</h1>
          <p className="text-ink-700/60 text-sm">{monthEvents.length} event{monthEvents.length === 1 ? "" : "s"} this month.</p>
        </div>
        {canManage && (
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Event
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {monthEvents.map((ev) => (
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
              {canManage && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(ev)} className="text-brand-700"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(ev.id)} className="text-rose-600"><Trash2 size={16} /></button>
                </div>
              )}
            </div>
            <p className="text-sm text-ink-800/80 mt-3 whitespace-pre-line">{ev.description}</p>

            {ev.attachment_url && (
              <div className="mt-3">
                {ev.attachment_type === "photo" && (
                  <img src={ev.attachment_url} alt="Event attachment" className="rounded-lg max-h-56 w-full object-cover" />
                )}
                {ev.attachment_type === "video" && (
                  <video src={ev.attachment_url} controls className="rounded-lg max-h-56 w-full object-cover" />
                )}
                {ev.attachment_type === "pdf" && (
                  <a
                    href={ev.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-brand-700 text-sm font-medium hover:underline"
                  >
                    <FileText size={16} /> View attached PDF
                  </a>
                )}
              </div>
            )}

            <button onClick={() => downloadPDF(ev)} className="btn-outline mt-4 flex items-center gap-2 text-sm">
              <Download size={14} /> Download PDF
            </button>
          </div>
        ))}
        {monthEvents.length === 0 && <p className="text-ink-700/50 text-sm">No events added for {openMonth} yet.</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-xl2 shadow-soft p-6 w-full max-w-lg relative my-auto">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-ink-700/50">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4">{editing ? "Edit Event" : `Add Event — ${openMonth}`}</h2>
            <form onSubmit={handleSave} className="space-y-3">
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

              <div>
                <label className="text-xs text-ink-700/60 font-medium flex items-center gap-1 mb-1">
                  <Paperclip size={13} /> Attach Photo / Video / PDF (optional)
                </label>
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
                {editing?.attachment_url && !attachmentFile && !removeExistingAttachment && (
                  <div className="flex items-center justify-between mt-2 bg-brand-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-ink-700/70 flex items-center gap-1">
                      {editing.attachment_type === "photo" && <ImageIcon size={13} />}
                      {editing.attachment_type === "video" && <Video size={13} />}
                      {editing.attachment_type === "pdf" && <FileText size={13} />}
                      Current attachment on file
                    </span>
                    <button type="button" onClick={() => setRemoveExistingAttachment(true)} className="text-rose-600 text-xs font-medium">
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <button type="submit" disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2">
                {uploading ? "Saving..." : editing ? "Save Changes" : "Add Event"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
