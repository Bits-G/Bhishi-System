"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search, Pencil, X, Briefcase, Building2, MapPin, Phone, UserCog,
  Folder, ArrowLeft, Plus, Trash2, AlertTriangle,
} from "lucide-react";

type Member = { id: number; alot_number: number; member_name: string; district: string; mobile_no?: string };
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

const upper = (v: string) => v.trim().toUpperCase();
const emptyForm: Partial<Entry> = {
  info_type: "work", work_name: "", work_role: "", business_name: "", business_role: "", business_mobile_no: "",
  place: "", business_area: "", landmark: "", city: "", state: "", pincode: "", work_status: "", additional_info: "",
};

function BusinessDirectoryInner({ canManage = false }: { canManage?: boolean }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const openAlot = searchParams.get("open"); // deep-link straight into a folder, e.g. from the update-business-info page

  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [openFolder, setOpenFolder] = useState<Member | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | "new" | null>(null);
  const [form, setForm] = useState<Partial<Entry>>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [clearingMember, setClearingMember] = useState<Member | null>(null);

  async function loadData() {
    setLoading(true);
    const { data: memberRows } = await supabase
      .from("members")
      .select("id, alot_number, member_name, district, mobile_no")
      .order("alot_number");
    const { data: entryRows } = await supabase.from("business_directory").select("*");
    setMembers(memberRows ?? []);
    setEntries(entryRows ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Auto-open the folder named in ?open=<alot_number>, once members have loaded.
  useEffect(() => {
    if (!openAlot || members.length === 0) return;
    const match = members.find((m) => m.alot_number === Number(openAlot));
    if (match) setOpenFolder(match);
  }, [openAlot, members]);

  function entriesFor(memberId: number) {
    return entries.filter((e) => e.member_id === memberId);
  }

  function formatAddress(e: Entry) {
    return [e.place, e.business_area, e.landmark, e.city, e.state, e.pincode].filter(Boolean).join(", ");
  }

  const foldersWithEntries = new Set(entries.map((e) => e.member_id));
  const visibleMembers = canManage ? members : members.filter((m) => foldersWithEntries.has(m.id));

  const q = search.trim().toLowerCase();
  const filteredMembers = !q
    ? visibleMembers
    : visibleMembers.filter((m) => {
        const memberMatch =
          m.member_name?.toLowerCase().includes(q) ||
          String(m.alot_number).includes(q) ||
          m.district?.toLowerCase().includes(q) ||
          m.mobile_no?.includes(q);
        const entryMatch = entriesFor(m.id).some(
          (e) =>
            e.business_name?.toLowerCase().includes(q) ||
            e.work_name?.toLowerCase().includes(q) ||
            e.place?.toLowerCase().includes(q) ||
            e.state?.toLowerCase().includes(q)
        );
        return memberMatch || entryMatch;
      });

  async function clearAllForMember() {
    if (!clearingMember) return;
    const { error } = await supabase.from("business_directory").delete().eq("member_id", clearingMember.id);
    if (error) {
      alert(error.message);
      return;
    }
    setClearingMember(null);
    if (openFolder?.id === clearingMember.id) setOpenFolder(null);
    loadData();
  }

  function openAddNew() {
    setForm(emptyForm);
    setEditingEntry("new");
  }

  function openEditEntry(entry: Entry) {
    setForm(entry);
    setEditingEntry(entry);
  }

  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!openFolder) return;
    setSaving(true);
    const payload = {
      member_id: openFolder.id,
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

    const isNew = editingEntry === "new";
    const { error } = isNew
      ? await supabase.from("business_directory").insert(payload)
      : await supabase.from("business_directory").update(payload).eq("id", (editingEntry as Entry).id);

    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingEntry(null);
    loadData();
  }

  async function handleDeleteEntry(entry: Entry) {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("business_directory").delete().eq("id", entry.id);
    if (error) {
      alert(error.message);
      return;
    }
    loadData();
  }

  if (!openFolder) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
              <Briefcase className="text-brand-600" /> Business Directory
            </h1>
            <p className="text-ink-700/60 text-sm">Open a member's folder to see their work, business, or services.</p>
            {!canManage && (
              <a href="/update-business-info" className="inline-flex items-center gap-1.5 text-brand-700 text-sm font-medium mt-2 hover:underline">
                <UserCog size={15} /> Add or update your own listing here
              </a>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-brand-400" size={16} />
            <input
              className="input pl-9 w-72"
              placeholder="Name, alot no, business, place, district, state, number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-ink-700/50 text-sm py-10 text-center">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMembers.map((m) => {
              const count = entriesFor(m.id).length;
              return (
                <div key={m.id} className="relative">
                  <button
                    onClick={() => setOpenFolder(m)}
                    className="card w-full text-left hover:shadow-soft transition flex flex-col items-start gap-2 bg-white/60 backdrop-blur border border-brand-100"
                  >
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
                      <Folder size={22} />
                    </div>
                    <p className="font-semibold text-ink-900 uppercase text-sm">Alot No. {m.alot_number} — {m.member_name}</p>
                    <p className="text-xs text-ink-700/50">
                      {count > 0 ? `${count} listing${count === 1 ? "" : "s"}` : "No business info added yet."}
                    </p>
                  </button>
                  {canManage && (
                    <button
                      onClick={() => setClearingMember(m)}
                      className="absolute top-3 right-3 text-ink-700/40 hover:text-rose-600"
                      title="Clear all info for this member"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              );
            })}
            {filteredMembers.length === 0 && <p className="text-ink-700/50 text-sm col-span-full text-center py-10">No folders found.</p>}
          </div>
        )}

        {clearingMember && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl2 shadow-soft p-6 w-full max-w-sm relative">
              <button onClick={() => setClearingMember(null)} className="absolute right-4 top-4 text-ink-700/50"><X size={20} /></button>
              <AlertTriangle className="text-rose-500 mb-2" size={28} />
              <h2 className="text-lg font-bold mb-1">Clear this folder?</h2>
              <p className="text-sm text-ink-700/60 mb-4">
                This removes all business/work listings for <b>{clearingMember.member_name}</b> (Alot No {clearingMember.alot_number}).
                Their folder will show "No business info added yet" here, and disappear from the public site.
                The member record itself is not affected.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setClearingMember(null)} className="btn-outline flex-1">Cancel</button>
                <button onClick={clearAllForMember} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg">Clear Folder</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const folderEntries = entriesFor(openFolder.id);

  return (
    <div>
      <button onClick={() => setOpenFolder(null)} className="text-brand-700 text-sm font-medium flex items-center gap-1 mb-4 hover:underline">
        <ArrowLeft size={16} /> Back to Business Directory
      </button>

      <h1 className="text-2xl font-bold text-ink-900 uppercase">Alot No. {openFolder.alot_number} — {openFolder.member_name}</h1>
      <p className="text-ink-700/60 text-sm mb-6">{openFolder.district} · {folderEntries.length} listing{folderEntries.length === 1 ? "" : "s"}</p>

      {!canManage && (
        <a
          href={`/update-business-info?alot=${openFolder.alot_number}`}
          className="inline-flex items-center gap-1.5 text-brand-700 text-sm font-medium mb-4 hover:underline"
        >
          <UserCog size={15} /> Add or Update your own listing here
        </a>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {folderEntries.map((e) => (
          <div key={e.id} className="card relative">
            {canManage && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button onClick={() => openEditEntry(e)} className="text-brand-700" title="Edit"><Pencil size={15} /></button>
                <button onClick={() => handleDeleteEntry(e)} className="text-rose-600" title="Delete"><Trash2 size={15} /></button>
              </div>
            )}
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">{e.info_type}</p>
            <div className="space-y-1.5 text-sm">
              {(e.info_type === "work" || e.info_type === "both") && e.work_name && (
                <p className="flex items-start gap-1.5">
                  <Building2 size={14} className="mt-0.5 text-brand-500 shrink-0" />
                  <span><b>Work:</b> {e.work_name}{e.work_role ? ` — ${e.work_role}` : ""}</span>
                </p>
              )}
              {(e.info_type === "business" || e.info_type === "both") && e.business_name && (
                <p className="flex items-start gap-1.5">
                  <Briefcase size={14} className="mt-0.5 text-brand-500 shrink-0" />
                  <span><b>Business:</b> {e.business_name}{e.business_role ? ` — ${e.business_role}` : ""}</span>
                </p>
              )}
              {formatAddress(e) && (
                <p className="flex items-start gap-1.5 text-ink-700/70">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span>{formatAddress(e)}</span>
                </p>
              )}
              {e.business_mobile_no && (
                <p className="flex items-start gap-1.5 text-ink-700/70">
                  <Phone size={14} className="mt-0.5 shrink-0" />
                  <span>{e.business_mobile_no}</span>
                </p>
              )}
              {e.work_status && <span className="badge-paid inline-block mt-1">{e.work_status}</span>}
              {e.additional_info && <p className="text-xs text-ink-700/60 mt-2 italic">{e.additional_info}</p>}
            </div>
          </div>
        ))}

        {canManage && (
          <button
            onClick={openAddNew}
            className="card border-2 border-dashed border-brand-300 text-brand-700 flex flex-col items-center justify-center gap-2 py-8 hover:bg-brand-50"
          >
            <Plus size={22} /> Add Business / Work / Service
          </button>
        )}

        {folderEntries.length === 0 && !canManage && (
          <p className="text-ink-700/50 text-sm col-span-full text-center py-10">No business info added yet.</p>
        )}
      </div>

      {editingEntry && canManage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-xl2 shadow-soft p-6 w-full max-w-lg relative my-auto">
            <button onClick={() => setEditingEntry(null)} className="absolute right-4 top-4 text-ink-700/50"><X size={20} /></button>
            <h2 className="text-lg font-bold mb-1">{editingEntry === "new" ? "Add Listing" : "Edit Listing"}</h2>
            <p className="text-sm text-ink-700/60 mb-4">Alot No {openFolder.alot_number} — {openFolder.member_name}</p>
            <form onSubmit={handleSaveEntry} className="space-y-3">
              <div className="flex gap-4 text-sm">
                {(["work", "business", "both"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5">
                    <input type="radio" checked={form.info_type === opt} onChange={() => setForm({ ...form, info_type: opt })} />
                    {opt === "work" ? "Work" : opt === "business" ? "Business" : "Both"}
                  </label>
                ))}
              </div>

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

              <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Saving..." : "Save"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusinessDirectoryBoard({ canManage = false }: { canManage?: boolean }) {
  return (
    <Suspense fallback={<p className="text-center text-ink-700/50 py-10">Loading...</p>}>
      <BusinessDirectoryInner canManage={canManage} />
    </Suspense>
  );
}
