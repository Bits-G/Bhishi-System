"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Cake, PartyPopper, Gift, MessageCircle, Sparkles } from "lucide-react";

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

const CARD_THEMES = [
  "from-pink-400 via-fuchsia-400 to-purple-500",
  "from-amber-400 via-orange-400 to-rose-500",
  "from-sky-400 via-cyan-400 to-blue-500",
  "from-emerald-400 via-teal-400 to-cyan-500",
  "from-violet-400 via-purple-400 to-indigo-500",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function BirthdaysBoard({ canNotify = false }: { canNotify?: boolean }) {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonth = new Date().getMonth(); // 0-11, real calendar month — birthdays repeat every year
  const currentMonthName = MONTH_NAMES[currentMonth];

  useEffect(() => {
    supabase
      .from("members")
      .select("*")
      .order("alot_number")
      .then(({ data }) => {
        const withBirthdayThisMonth = (data ?? []).filter((m: Member) => {
          if (!m.dob) return false;
          const d = new Date(m.dob);
          return !isNaN(d.getTime()) && d.getMonth() === currentMonth;
        });
        setMembers(withBirthdayThisMonth);
        setLoading(false);
      });
  }, []);

  function formatDob(dob: string) {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return dob;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  }

  function birthdayDay(dob: string) {
    const d = new Date(dob);
    return isNaN(d.getTime()) ? "" : d.getDate();
  }

  async function notifyBirthday(m: Member) {
    const number = m.whatsapp_no;
    if (!number) {
      alert("No WhatsApp number on file for this member.");
      return;
    }
    const res = await fetch("/api/notify-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: number.replace(/\D/g, ""),
        message: `🎉🎂 Happy Birthday ${m.member_name}! Wishing you a wonderful year ahead, from the entire Wani Summit family! 🎈🎁`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed to send WhatsApp message");
      return;
    }
    alert("Birthday wish sent on WhatsApp!");
  }

  return (
    <div>
      {/* Decorated header banner */}
      <div className="relative overflow-hidden rounded-xl2 mb-8 p-8 bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 text-white shadow-soft">
        <div className="absolute -top-6 -right-6 opacity-20">
          <PartyPopper size={140} />
        </div>
        <div className="absolute -bottom-8 -left-8 opacity-10">
          <Gift size={120} />
        </div>
        <div className="relative flex items-center gap-3">
          <Cake size={36} />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Birthdays of the Month</h1>
            <p className="text-purple-100 flex items-center gap-1 mt-1">
              <Sparkles size={16} /> Celebrating everyone born in {currentMonthName}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-ink-700/50 text-sm py-10 text-center">Loading birthdays...</p>
      ) : members.length === 0 ? (
        <div className="card text-center py-12">
          <Cake size={40} className="mx-auto text-brand-300 mb-3" />
          <p className="text-ink-700/60">No birthdays recorded for {currentMonthName} yet.</p>
          <p className="text-ink-700/40 text-sm mt-1">Make sure members' DOB is filled in via the Members section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m, i) => (
            <div key={m.id} className="group relative">
              <div
                className={`rounded-xl2 p-5 text-white shadow-card hover:shadow-soft transition bg-gradient-to-br ${CARD_THEMES[i % CARD_THEMES.length]}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Cake size={26} />
                  <span className="text-2xl font-extrabold opacity-90">Day {birthdayDay(m.dob)}</span>
                </div>
                <p className="text-lg font-bold leading-tight">{m.member_name}</p>
                <p className="text-sm text-white/80 mt-1">{m.district}</p>
                <p className="text-xs text-white/70 mt-2">Alot No: {m.alot_number}</p>

                {canNotify && (
                  <button
                    onClick={() => notifyBirthday(m)}
                    className="mt-4 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
                  >
                    <MessageCircle size={14} /> Notify on WhatsApp
                  </button>
                )}
              </div>

              {/* Hover detail box */}
              <div className="hidden group-hover:block absolute z-20 top-full left-0 mt-2 w-72 bg-white text-ink-900 rounded-xl2 shadow-soft border border-brand-100 p-4">
                <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">Full Details</p>
                <table className="text-xs w-full">
                  <tbody>
                    <tr><td className="py-1 pr-3 text-ink-700/60">Sr.no.</td><td className="py-1 font-medium">{m.sr_no}</td></tr>
                    <tr><td className="py-1 pr-3 text-ink-700/60">District</td><td className="py-1 font-medium">{m.district}</td></tr>
                    <tr><td className="py-1 pr-3 text-ink-700/60">Member Name</td><td className="py-1 font-medium">{m.member_name}</td></tr>
                    <tr><td className="py-1 pr-3 text-ink-700/60">DOB</td><td className="py-1 font-medium">{formatDob(m.dob)}</td></tr>
                    <tr><td className="py-1 pr-3 text-ink-700/60">WhatsApp No.</td><td className="py-1 font-medium">{m.whatsapp_no || "-"}</td></tr>
                    <tr><td className="py-1 pr-3 text-ink-700/60">Mobile No.</td><td className="py-1 font-medium">{m.mobile_no || "-"}</td></tr>
                    <tr><td className="py-1 pr-3 text-ink-700/60">Alot No.</td><td className="py-1 font-medium">{m.alot_number}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
