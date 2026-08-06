"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Plus, MessageCircle } from "lucide-react";

type Member = { id: number; member_name: string; alot_number: number; whatsapp_no?: string };
type Winner = { id: number; member_id: number; month: string; business_designation: string; members: Member };

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, i, 1);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

export default function WinnersBoard() {
  const supabase = createClient();
  const [activeMonth, setActiveMonth] = useState(0);
  const [eligible, setEligible] = useState<Member[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [selectedMember, setSelectedMember] = useState<number | "">("");
  const [designation, setDesignation] = useState("");
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
    if (winners.length >= 12) {
      alert("12 winners already added for this month!");
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
        message: `🎉 Congratulations ${w.members?.member_name}! You are the Bhishi lucky draw winner for ${w.month}. Please contact the committee for further details.`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed to send WhatsApp message");
      return;
    }
    alert("WhatsApp notification sent!");
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
          Add Winner for {monthKey} ({winners.length}/12 added)
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
          <div key={w.id} className="card border-amber-200 bg-amber-50/40">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={18} className="text-amber-500" />
              <p className="font-bold text-ink-900">{w.members?.member_name}</p>
            </div>
            <p className="text-sm text-ink-700/70">Alot No: {w.members?.alot_number}</p>
            {w.business_designation && <p className="text-sm text-brand-800 mt-1">{w.business_designation}</p>}
            <button
              onClick={() => notifyWinner(w)}
              className="text-emerald-700 text-xs font-medium flex items-center gap-1 mt-3 hover:underline"
            >
              <MessageCircle size={14} /> Notify on WhatsApp
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
