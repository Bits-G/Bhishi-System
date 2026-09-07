"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Pencil, X, Briefcase, Building2, MapPin, Phone, UserCog } from "lucide-react";

type Member = { id: number; alot_number: number; member_name: string; district: string };
type Entry = {
  id: number;
  member_id: number;
  info_type: "work" | "business" | "both";
  work_name?: string;
  work_role?: string;
  business_name?: string;
  business_role?: string;
  business_mobile_no?: string;
  place?: string;
  business_area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  work_status?: string;
  additional_info?: string;
};
type Row = { member: Member; entry?: Entry };

const upper = (v: string) => v.trim().toUpperCase();

export default function BusinessDirectoryBoard({ canManage = false }: { canManage?: boolean }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  // "none" is a client-only state meaning "clear this entry" — it is never written
  // to the database as info_type (the DB column only allows work/business/both).
  // Saving with "none" selected deletes the row instead of upserting it.
  const [form, setForm] = useState<Omit<Partial<Entry>, "info_type"> & { info_type?: Entry["info_type"] | "none" }>({});
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const { data: members } = await supabase
      .from("members")
      .select("id, alot_number, member_name, district")
      .order("alot_number");
    const { data: entries } = await supabase.from("business_directory").select("*");

    const entryMap: Record<number, Entry> = {};
    (entries ?? []).forEach((e: Entry) => (entryMap[e.member_id] = e));

    let combined: Row[] = (members ?? []).map((m) => ({ member: m, entry: entryMap[m.id] }));
    if (!canManage) combined = combined.filter((r) => r.entry);

    setRows(combined);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openEdit(row: Row) {
    setEditing(row);
    setForm(
      row.entry ?? {
        info_type: "work",
        work_name: "", work_role: "", business_name: "", business_role: "", business_mobile_no: "",
        place: "", business_area: "", landmark: "", city: "", state: "", pincode: "",
        work_status: "", additional_info: "",
      }
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);

    // "None" selected -> clear the entry entirely, same as if it had never been filled.
    if (form.info_type === "none") {
      const { error } = await supabase.from("business_directory").delete().eq("member_id", editing.member.id);
      setSaving(false);
      if (error) {
        alert(error.message);
        return;
      }
      setEditing(null);
      loadData();
      return;
    }

    const payload = {
      member_id: editing.member.id,
      info_type: form.info_type,
      work_name: form.work_name ? upper(form.work_name) : null,
      work_role: form.work_role ? upper(form.work_role) : null,
      business_name: form.business_name ? upper(form.business_name) : null,
      business_role: form.business_role ? upper(form.business_role) : null,
      business_mobile_no: form.business_mobile_no || null,
      place: form.place ? upper(form.place) : null,
      business_area: form.business_area ? upper(form.business_area) : null,
      landmark: form.landmark ? upper(form.landmark) : null,
      city: form.city ? upper(form.city) : null,
      state: form.state ? upper(form.state) : null,
      pincode: form.pincode || null,
      work_status: form.work_status ? upper(form.work_status) : null,
      additional_info: form.additional_info ? upper(form.additional_info) : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("business_directory").upsert(payload, { onConflict: "member_id" });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEditing(null);
    loadData();
  }

  function formatAddress(e: Entry) {
    return [e.place, e.business_area, e.landmark, e.city, e.state, e.pincode].filter(Boolean).join(", ");
  }

  const filtered = rows.filter(
    (r) =>
      r.member.member_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(r.member.alot_number).includes(search) ||
      r.member.district?.toLowerCase().includes(search.toLowerCase()) ||
      r.entry?.work_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.entry?.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            <Briefcase className="text-brand-600" /> Business Directory
          </h1>
          <p className="text-ink-700/60 text-sm">What each member does — work, business, or both.</p>
          {!canManage && (
            <a href="/update-business-info" className="inline-flex items-center gap-1.5 text-brand-700 text-sm font-medium mt-2 hover:underline">
              <UserCog size={15} /> Add or update your own listing here
            </a>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-brand-400" size={16} />
          <input
            className="input pl-9 w-64"
            placeholder="Search name, district, work, business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-ink-700/50 text-sm py-10 text-center">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => (
            <div key={r.member.id} className="card relative">
              {canManage && (
                <button onClick={() => openEdit(r)} className="absolute top-3 right-3 text-brand-700" title="Edit">
                  <Pencil size={15} />
                </button>
              )}
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Alot No. {r.member.alot_number}</p>
              <p className="text-lg font-bold text-ink-900 uppercase">{r.member.member_name}</p>
              <p className="text-xs text-ink-700/50 mb-3">{r.member.district}</p>

              {r.entry ? (
                <div className="space-y-1.5 text-sm">
                  {(r.entry.info_type === "work" || r.entry.info_type === "both") && r.entry.work_name && (
                    <p className="flex items-start gap-1.5">
                      <Building2 size={14} className="mt-0.5 text-brand-500 shrink-0" />
                      <span><b>Work:</b> {r.entry.work_name}{r.entry.work_role ? ` — ${r.entry.work_role}` : ""}</span>
                    </p>
                  )}
                  {(r.entry.info_type === "business" || r.entry.info_type === "both") && r.entry.business_name && (
                    <p className="flex items-start gap-1.5">
                      <Briefcase size={14} className="mt-0.5 text-brand-500 shrink-0" />
                      <span><b>Business:</b> {r.entry.business_name}{r.entry.business_role ? ` — ${r.entry.business_role}` : ""}</span>
                    </p>
                  )}
                  {formatAddress(r.entry) && (
                    <p className="flex items-start gap-1.5 text-ink-700/70">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      <span>{formatAddress(r.entry)}</span>
                    </p>
                  )}
                  {r.entry.business_mobile_no && (
                    <p className="flex items-start gap-1.5 text-ink-700/70">
                      <Phone size={14} className="mt-0.5 shrink-0" />
                      <span>{r.entry.business_mobile_no}</span>
                    </p>
                  )}
                  {r.entry.work_status && <span className="badge-paid inline-block mt-1">{r.entry.work_status}</span>}
                  {r.entry.additional_info && <p className="text-xs text-ink-700/60 mt-2 italic">{r.entry.additional_info}</p>}
                </div>
              ) : (
                <p className="text-sm text-ink-700/40">No business info added yet.</p>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-ink-700/50 text-sm col-span-full text-center py-10">No entries found.</p>}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-xl2 shadow-soft p-6 w-full max-w-lg relative my-auto">
            <button onClick={() => setEditing(null)} className="absolute right-4 top-4 text-ink-700/50"><X size={20} /></button>
            <h2 className="text-lg font-bold mb-1">Edit Business Info</h2>
            <p className="text-sm text-ink-700/60 mb-4">Alot No {editing.member.alot_number} — {editing.member.member_name}</p>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="flex gap-4 text-sm flex-wrap">
                {(["work", "business", "both", "none"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5">
                    <input type="radio" checked={form.info_type === opt} onChange={() => setForm({ ...form, info_type: opt })} />
                    {opt === "work" ? "Work" : opt === "business" ? "Business" : opt === "both" ? "Both" : "None"}
                  </label>
                ))}
              </div>

              {form.info_type === "none" && (
                <p className="text-xs text-ink-700/60 bg-brand-50 rounded-lg px-3 py-2">
                  Saving with "None" selected will clear this member's entry — their card will show
                  "No business info added yet" here, and disappear from the public Business Directory.
                </p>
              )}

              {(form.info_type === "work" || form.info_type === "both") && (
                <>
                  <input className="input" placeholder="Work Name / Organization" value={form.work_name ?? ""} onChange={(e) => setForm({ ...form, work_name: e.target.value })} />
                  <input className="input" placeholder="Work Role" value={form.work_role ?? ""} onChange={(e) => setForm({ ...form, work_role: e.target.value })} />
                </>
              )}
              {(form.info_type === "business" || form.info_type === "both") && (
                <>
                  <input className="input" placeholder="Business Name" value={form.business_name ?? ""} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
                  <input className="input" placeholder="Business Role" value={form.business_role ?? ""} onChange={(e) => setForm({ ...form, business_role: e.target.value })} />
                  <input className="input" placeholder="Business Mobile Number" value={form.business_mobile_no ?? ""} onChange={(e) => setForm({ ...form, business_mobile_no: e.target.value })} />
                </>
              )}

              {form.info_type !== "none" && (
                <>
                  <input className="input" placeholder="Place" value={form.place ?? ""} onChange={(e) => setForm({ ...form, place: e.target.value })} />
                  <input className="input" placeholder="Business Area" value={form.business_area ?? ""} onChange={(e) => setForm({ ...form, business_area: e.target.value })} />
                  <input className="input" placeholder="Nearby Landmark" value={form.landmark ?? ""} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" placeholder="City" value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    <input className="input" placeholder="State" value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  </div>
                  <input className="input" placeholder="Pin Code" value={form.pincode ?? ""} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                  <input className="input" placeholder="Current Work Status" value={form.work_status ?? ""} onChange={(e) => setForm({ ...form, work_status: e.target.value })} />
                  <textarea className="input min-h-[70px]" placeholder="Additional Information" value={form.additional_info ?? ""} onChange={(e) => setForm({ ...form, additional_info: e.target.value })} />
                </>
              )}

              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? "Saving..." : form.info_type === "none" ? "Clear This Entry" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
