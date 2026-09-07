"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Pencil, Check, X, Briefcase } from "lucide-react";

type Member = {
  id: number;
  member_name: string;
  alot_number: number;
  district?: string;
  work_designation?: string | null;
};

export default function WorkBoard({ canManage = false }: { canManage?: boolean }) {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadMembers() {
    const { data } = await supabase
      .from("members")
      .select("id, member_name, alot_number, district, work_designation")
      .order("alot_number");
    setMembers(data ?? []);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function saveWork(id: number) {
    setSaving(true);
    const { error } = await supabase.from("members").update({ work_designation: editValue }).eq("id", id);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingId(null);
    loadMembers(); // re-fetch so this reflects live everywhere (dashboard, viewer site, etc.)
  }

  const filtered = members.filter(
    (m) =>
      m.member_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(m.alot_number).includes(search) ||
      m.district?.toLowerCase().includes(search.toLowerCase()) ||
      m.work_designation?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            <Briefcase className="text-brand-600" /> Work / Designation
          </h1>
          <p className="text-ink-700/60 text-sm">What each member does — business, job, or profession.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-brand-400" size={16} />
          <input
            className="input pl-9 w-64"
            placeholder="Search name, district, alot no, work..."
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
              <th className="py-2 pr-4">Member Name</th>
              <th className="py-2 pr-4">District</th>
              <th className="py-2 pr-4">Work / Designation</th>
              {canManage && <th className="py-2 pr-4">Edit</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-brand-50">
                <td className="py-2 pr-4">{m.alot_number}</td>
                <td className="py-2 pr-4 font-medium">{m.member_name}</td>
                <td className="py-2 pr-4">{m.district}</td>
                <td className="py-2 pr-4">
                  {editingId === m.id ? (
                    <input
                      className="input py-1 text-sm w-56"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="e.g. Grocery shop owner"
                      autoFocus
                    />
                  ) : (
                    m.work_designation || <span className="text-ink-700/40">Not set</span>
                  )}
                </td>
                {canManage && (
                  <td className="py-2 pr-4">
                    {editingId === m.id ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => saveWork(m.id)} disabled={saving} className="text-emerald-600" title="Save">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-ink-700/50" title="Cancel">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(m.id);
                          setEditValue(m.work_designation ?? "");
                        }}
                        className="text-brand-700"
                        title="Edit work/designation"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="py-6 text-center text-ink-700/50">
                  No members match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
