"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pencil, X, Search } from "lucide-react";

type Member = {
  id: number;
  sr_no: number;
  district: string;
  member_name: string;
  dob: string;
  whatsapp_no: string;
  mobile_no: string;
  alot_number: number;
};

export default function AdminMembersPage() {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Member | null>(null);

  async function loadMembers() {
    const { data } = await supabase.from("members").select("*").order("alot_number");
    setMembers(data ?? []);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { id, ...rest } = editing;
    await supabase.from("members").update(rest).eq("id", id);
    setEditing(null);
    loadMembers();
  }

  const filtered = members.filter(
    (m) =>
      m.member_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(m.alot_number).includes(search) ||
      m.district?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Members</h1>
          <p className="text-ink-700/60 text-sm">{members.length} members registered. New bulk import is done by Master Admin.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-brand-400" size={16} />
          <input
            className="input pl-9 w-64"
            placeholder="Search name, district, alot no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-800 border-b border-brand-100">
              <th className="py-2 pr-4">Alot No.</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">District</th>
              <th className="py-2 pr-4">Mobile</th>
              <th className="py-2 pr-4">WhatsApp</th>
              <th className="py-2 pr-4">Edit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-brand-50">
                <td className="py-2 pr-4">{m.alot_number}</td>
                <td className="py-2 pr-4 font-medium">{m.member_name}</td>
                <td className="py-2 pr-4">{m.district}</td>
                <td className="py-2 pr-4">{m.mobile_no}</td>
                <td className="py-2 pr-4">{m.whatsapp_no}</td>
                <td className="py-2 pr-4">
                  <button onClick={() => setEditing(m)} className="text-brand-700">
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl2 shadow-soft p-6 w-full max-w-md relative">
            <button onClick={() => setEditing(null)} className="absolute right-4 top-4 text-ink-700/50">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4">Edit Member</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <input className="input" value={editing.member_name}
                onChange={(e) => setEditing({ ...editing, member_name: e.target.value })} placeholder="Name" />
              <input className="input" value={editing.district ?? ""}
                onChange={(e) => setEditing({ ...editing, district: e.target.value })} placeholder="District" />
              <input className="input" value={editing.mobile_no ?? ""}
                onChange={(e) => setEditing({ ...editing, mobile_no: e.target.value })} placeholder="Mobile No" />
              <input className="input" value={editing.whatsapp_no ?? ""}
                onChange={(e) => setEditing({ ...editing, whatsapp_no: e.target.value })} placeholder="WhatsApp No" />
              <div>
                <label className="text-xs text-ink-700/60 font-medium">Date of Birth</label>
                <input className="input mt-1" type="date" value={editing.dob ?? ""}
                  onChange={(e) => setEditing({ ...editing, dob: e.target.value })} />
              </div>
              <input className="input" type="number" value={editing.alot_number}
                onChange={(e) => setEditing({ ...editing, alot_number: Number(e.target.value) })} placeholder="Alot Number" />
              <button type="submit" className="btn-primary w-full">Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
