"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Plus, MessageCircle, Pencil, Trash2, X, Check } from "lucide-react";

type Member = { id: number; member_name: string; alot_number: number; whatsapp_no?: string };
type Winner = { id: number; member_id: number; month: string; business_designation: string; members: Member };

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 7 + i, 1); // Aug 2026 -> July 2027
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

export default function WinnersBoard({ isMasterAdmin = false }: { isMasterAdmin?: boolean }) {
  const supabase = createClient();
  const [activeMonth, setActiveMonth] = useState(0);
  const [eligible, setEligible] = useState<Member[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [selectedMember, setSelectedMember] = useState<number | "">("");
  const [designation, setDesignation] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const monthKey = MONTHS[activeMonth];

  async function loadData() {
    // Members who are NOT already in the winners table (any month) — the "no repeat" rule
    const { data: allWinners } = await supabase.from("winners").select("member_id, members(*)").order("won_at");
    const wonIds = (allWinners ?? []).map((w: any) => w.member_id);

    const { data: allMembers } = await supabase.from("members").select("id, member_name, alot_number").order("alot_number");
    setEligible((allMembers ?? []).filter((m) => !wonIds.includes(m.id)));

    const { data: thisMonthWinners } = await supabase
      .from("winners")
      .select("id, member_id, month, business_designation, members(*)")
      .eq("month", monthKey);
    setWinners((thisMonthWinners as any) ?? []);
  }

  useEffect(() => {
    loadData();
  }, [activeMonth]);

  async function addWinner() {
    if (!selectedMember) return;
    if (winners.length >= 13) {
      alert("13 winners already added for this month!");
      return;
    }
    const { error } = await supabase.from("winners").insert({
      member_id: selectedMember,
      month: monthKey,
      business_designation: designation,
    });
    if (error) {
      alert(error.message.includes("duplicate") ? "This member has already won in a previous month!" : error.message);
      return;
    }
    setSelectedMember("");
    setDesignation("");
    loadData();
  }

  async function notifyWinner(w: Winner) {
    const number = w.members?.whatsapp_no;
    if (!number) {
      alert("No WhatsApp number on file for this member.");
      return;
    }
    const res = await fetch("/api/notify-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: number.replace(/\D/g, ""), // strip spaces/dashes, keep digits only
        message: `🎉 Congratulations ${w.members?.member_name}! You are the Wani Summit lucky draw winner for ${w.month}. Please contact the committee for further details.`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed to send WhatsApp message");
      return;
    }
    alert("WhatsApp notification sent!");
  }

  async function deleteWinner(w: Winner) {
    if (
      !confirm(
        `Remove ${w.members?.member_name} from ${w.month} winners? They will become eligible for future lucky draws again.`
      )
    )
      return;
    const { error } = await supabase.from("winners").delete().eq("id", w.id);
    if (error) {
      alert(error.message);
      return;
    }
    loadData();
  }

  async function saveDesignation(w: Winner) {
    const { error } = await supabase.from("winners").update({ business_designation: editValue }).eq("id", w.id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingId(null);
    loadData();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1 flex items-center gap-2">
        <Trophy className="text-amber-500" /> Winners of the Month
      </h1>
      <p className="text-ink-700/60 mb-4">
        Once a member wins, they are permanently removed from future lucky draw eligibility.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        {MONTHS.map((m, i) => (
          <button
            key={m}
            onClick={() => setActiveMonth(i)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              i === activeMonth ? "bg-brand-700 text-white shadow-soft" : "bg-white text-ink-700 border border-brand-100"
            }`}
          >
            Month {i + 1}
          </button>
        ))}
      </div>

      <div className="card mb-6">
        <p className="font-semibold mb-3">
          Add Winner for {monthKey} ({winners.length}/13 added)
        </p>
        <div className="flex flex-wrap gap-3">
          <select className="input flex-1 min-w-[200px]" value={selectedMember} onChange={(e) => setSelectedMember(Number(e.target.value))}>
            <option value="">Select eligible member...</option>
            {eligible.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.alot_number} — {m.member_name}
              </option>
            ))}
          </select>
          <input
            className="input flex-1 min-w-[200px]"
            placeholder="Business / Designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
          <button onClick={addWinner} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Winner
          </button>
        </div>
        <p className="text-xs text-ink-700/50 mt-2">{eligible.length} members still eligible for future draws.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {winners.map((w) => (
          <div key={w.id} className="card border-amber-200 bg-amber-50/40 relative">
            {isMasterAdmin && (
              <button
                onClick={() => deleteWinner(w)}
                className="absolute top-3 right-3 text-rose-600 hover:text-rose-800"
                title="Remove this winner (mistaken entry)"
              >
                <Trash2 size={16} />
              </button>
            )}
            <div className="flex items-center gap-2 mb-1 pr-6">
              <Trophy size={18} className="text-amber-500" />
              <p className="font-bold text-ink-900">{w.members?.member_name}</p>
            </div>
            <p className="text-sm text-ink-700/70">Alot No: {w.members?.alot_number}</p>

            {editingId === w.id ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  className="input py-1 text-sm flex-1"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Business / Designation"
                  autoFocus
                />
                <button onClick={() => saveDesignation(w)} className="text-emerald-600" title="Save">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} className="text-ink-700/50" title="Cancel">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-brand-800">{w.business_designation || <span className="text-ink-700/40">No designation set</span>}</p>
                <button
                  onClick={() => {
                    setEditingId(w.id);
                    setEditValue(w.business_designation ?? "");
                  }}
                  className="text-brand-700"
                  title="Edit business/designation"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}

            <button
              onClick={() => notifyWinner(w)}
              className="text-emerald-700 text-xs font-medium flex items-center gap-1 mt-3 hover:underline"
            >
              <MessageCircle size={14} /> Notify on WhatsApp
            </button>
          </div>
        ))}
        {winners.length === 0 && (
          <p className="text-ink-700/50 text-sm col-span-full">No winners added for {monthKey} yet.</p>
        )}
      </div>
    </div>
  );
}
