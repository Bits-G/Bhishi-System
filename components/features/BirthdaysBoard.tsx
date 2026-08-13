"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Cake, PartyPopper, Gift, MessageCircle, Sparkles, Folder, ArrowLeft, History, CalendarClock } from "lucide-react";

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

// Same Aug-start cycle order used everywhere else in the app (Attendance, Payments,
// Gallery, Winners), just without a year attached — birthdays repeat every year, so
// this is a rolling 12-month wheel: Aug, Sep, ... Jul, then back to Aug again.
const MONTH_CYCLE = [
  "August", "September", "October", "November", "December", "January",
  "February", "March", "April", "May", "June", "July",
];

export default function BirthdaysBoard({ canNotify = false }: { canNotify?: boolean }) {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFolderMonth, setOpenFolderMonth] = useState<string | null>(null);

  const currentMonthName = new Date().toLocaleString("default", { month: "long" });
  const currentIdx = MONTH_CYCLE.indexOf(currentMonthName);
  const pastMonths = MONTH_CYCLE.slice(0, currentIdx);
  const incomingMonths = MONTH_CYCLE.slice(currentIdx + 1);

  useEffect(() => {
    supabase
      .from("members")
      .select("*")
      .order("alot_number")
      .then(({ data }) => {
        setMembers((data ?? []).filter((m: Member) => m.dob && !isNaN(new Date(m.dob).getTime())));
        setLoading(false);
      });
  }, []);

  function getMembersForMonth(monthName: string): Member[] {
    return members
      .filter((m) => new Date(m.dob).toLocaleString("default", { month: "long" }) === monthName)
      .sort((a, b) => new Date(a.dob).getDate() - new Date(b.dob).getDate()); // 1 -> 31, not A-Z
  }

  function formatDob(dob: string) {
    const d = new Date(dob);
    return isNaN(d.getTime()) ? dob : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
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

  function renderCards(list: Member[], emptyLabel: string) {
    if (list.length === 0) {
      return (
        <div className="card text-center py-12">
          <Cake size={40} className="mx-auto text-brand-300 mb-3" />
          <p className="text-ink-700/60">{emptyLabel}</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((m, i) => (
          <div key={m.id} className="group relative">
            <div className={`rounded-xl2 p-5 text-white shadow-card hover:shadow-soft transition bg-gradient-to-br ${CARD_THEMES[i % CARD_THEMES.length]}`}>
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
    );
  }

  function renderFolderGrid(monthList: string[]) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {monthList.map((m) => {
          const count = getMembersForMonth(m).length;
          return (
            <button
              key={m}
              onClick={() => setOpenFolderMonth(m)}
              className="card text-left hover:shadow-soft transition flex flex-col items-start gap-2"
            >
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
                <Folder size={22} />
              </div>
              <p className="font-semibold text-ink-900">{m}</p>
              <p className="text-xs text-ink-700/50">{count} birthday{count === 1 ? "" : "s"}</p>
            </button>
          );
        })}
      </div>
    );
  }

  if (loading) {
    return <p className="text-ink-700/50 text-sm py-10 text-center">Loading birthdays...</p>;
  }

  // ---------- INSIDE A PAST/INCOMING MONTH FOLDER ----------
  if (openFolderMonth) {
    return (
      <div>
        <button
          onClick={() => setOpenFolderMonth(null)}
          className="text-brand-700 text-sm font-medium flex items-center gap-1 mb-4 hover:underline"
        >
          <ArrowLeft size={16} /> Back to Birthdays of the Month
        </button>
        <h1 className="text-2xl font-bold text-ink-900 mb-6 flex items-center gap-2">
          <Cake className="text-purple-500" /> {openFolderMonth} Birthdays
        </h1>
        {renderCards(getMembersForMonth(openFolderMonth), `No birthdays recorded for ${openFolderMonth}.`)}
      </div>
    );
  }

  // ---------- MAIN OVERVIEW: current month + Past/Incoming folders ----------
  return (
    <div>
      <div className="relative overflow-hidden rounded-xl2 mb-8 p-8 bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 text-white shadow-soft">
        <div className="absolute -top-6 -right-6 opacity-20"><PartyPopper size={140} /></div>
        <div className="absolute -bottom-8 -left-8 opacity-10"><Gift size={120} /></div>
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

      {renderCards(getMembersForMonth(currentMonthName), `No birthdays recorded for ${currentMonthName} yet.`)}

      {pastMonths.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">
            <History size={20} className="text-brand-600" /> Past Month Birthdays
          </h2>
          {renderFolderGrid(pastMonths)}
        </div>
      )}

      {incomingMonths.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">
            <CalendarClock size={20} className="text-brand-600" /> Incoming Birthdays
          </h2>
          {renderFolderGrid(incomingMonths)}
        </div>
      )}
    </div>
  );
}
