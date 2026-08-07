"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Users,
  Wallet,
  CircleDollarSign,
  UserCheck,
  UserX,
  Trophy,
  ShieldCheck,
  Download,
  Pencil,
  X,
  Check,
} from "lucide-react";

type Member = { id: number; member_name: string; alot_number: number; district?: string };
type CardKey = "members" | "paid" | "unpaid" | "present" | "absent" | "winners" | "admins";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 7 + i, 1); // Aug 2026 -> July 2027
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

export default function DashboardBoard({ portal }: { portal: "master-admin" | "admin" | "viewer" }) {
  const supabase = createClient();
  const router = useRouter();
  const isStaff = portal === "master-admin" || portal === "admin"; // can edit
  const prefix = portal === "master-admin" ? "/master-admin" : "/admin";

  const [members, setMembers] = useState<Member[]>([]);
  const [counts, setCounts] = useState({ members: 0, paid: 0, unpaid: 0, present: 0, absent: 0, winners: 0, admins: 0 });
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [activeMonth, setActiveMonth] = useState(0);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({}); // member_id -> status, for current panel+month
  const [winners, setWinners] = useState<any[]>([]);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [editingWinnerId, setEditingWinnerId] = useState<number | null>(null);
  const [editWinnerValue, setEditWinnerValue] = useState("");

  useEffect(() => {
    loadCounts();
  }, []);

  async function loadCounts() {
    const [{ data: memberRows, count: memberCount }, { count: paidCount }, { count: presentCount }, { count: winnerCount }] =
      await Promise.all([
        supabase.from("members").select("id, member_name, alot_number, district", { count: "exact" }).order("alot_number"),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "paid"),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("status", "present"),
        supabase.from("winners").select("*", { count: "exact", head: true }),
      ]);

    setMembers(memberRows ?? []);
    const totalSlots = (memberCount ?? 0) * 12;

    let adminCount = 0;
    if (portal === "master-admin") {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin");
      adminCount = count ?? 0;
    }

    setCounts({
      members: memberCount ?? 0,
      paid: paidCount ?? 0,
      unpaid: Math.max(totalSlots - (paidCount ?? 0), 0),
      present: presentCount ?? 0,
      absent: Math.max(totalSlots - (presentCount ?? 0), 0),
      winners: winnerCount ?? 0,
      admins: adminCount,
    });
  }

  async function openCard(key: CardKey) {
    if (key === "admins") {
      if (portal === "master-admin") router.push("/master-admin/admins");
      return; // not clickable for admin/viewer
    }
    if (activeCard === key) {
      setActiveCard(null);
      return;
    }
    setActiveCard(key);
    if (key === "winners") {
      await loadWinners();
    } else if (key !== "members") {
      await loadStatusForMonth(key, activeMonth);
    }
  }

  async function loadWinners() {
    setLoadingPanel(true);
    const { data } = await supabase
      .from("winners")
      .select("id, month, business_designation, members(member_name, alot_number)")
      .order("won_at", { ascending: false });
    setWinners(data ?? []);
    setLoadingPanel(false);
  }

  async function loadStatusForMonth(key: CardKey, monthIndex: number) {
    setLoadingPanel(true);
    const monthKey = MONTHS[monthIndex];
    const table = key === "paid" || key === "unpaid" ? "payments" : "attendance";
    const { data } = await supabase.from(table).select("member_id, status").eq("month", monthKey);
    const map: Record<number, string> = {};
    (data ?? []).forEach((r: any) => (map[r.member_id] = r.status));
    setStatusMap(map);
    setLoadingPanel(false);
  }

  async function changeMonth(i: number) {
    setActiveMonth(i);
    if (activeCard && activeCard !== "members" && activeCard !== "winners") {
      await loadStatusForMonth(activeCard, i);
    }
  }

  function getFilteredMembers(): Member[] {
    if (activeCard === "paid") return members.filter((m) => statusMap[m.id] === "paid");
    if (activeCard === "unpaid") return members.filter((m) => statusMap[m.id] !== "paid");
    if (activeCard === "present") return members.filter((m) => statusMap[m.id] === "present");
    if (activeCard === "absent") return members.filter((m) => statusMap[m.id] !== "present");
    return members;
  }

  function panelTitle(): string {
    switch (activeCard) {
      case "members": return "All Members";
      case "paid": return `Paid Members — ${MONTHS[activeMonth]}`;
      case "unpaid": return `Pending Payments — ${MONTHS[activeMonth]}`;
      case "present": return `Present Members — ${MONTHS[activeMonth]}`;
      case "absent": return `Absent Members — ${MONTHS[activeMonth]}`;
      case "winners": return "All Winners";
      default: return "";
    }
  }

  function downloadPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Wani Summit — ${panelTitle()}`, 14, 15);
    if (activeCard === "winners") {
      autoTable(doc, {
        startY: 22,
        head: [["Month", "Alot No.", "Member Name", "Business/Designation"]],
        body: winners.map((w) => [w.month, w.members?.alot_number, w.members?.member_name, w.business_designation ?? "-"]),
      });
    } else {
      autoTable(doc, {
        startY: 22,
        head: [["Alot No.", "Member Name"]],
        body: getFilteredMembers().map((m) => [m.alot_number, m.member_name]),
      });
    }
    doc.save(`WaniSummit-${activeCard}-${MONTHS[activeMonth].replace(" ", "-")}.pdf`);
  }

  function handleEdit() {
    if (activeCard === "paid" || activeCard === "unpaid") router.push(`${prefix}/payments`);
    else if (activeCard === "present" || activeCard === "absent") router.push(`${prefix}/attendance`);
    else if (activeCard === "winners") router.push(`${prefix}/winners`);
  }

  async function saveWinnerDesignation(winnerId: number) {
    const { error } = await supabase.from("winners").update({ business_designation: editWinnerValue }).eq("id", winnerId);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingWinnerId(null);
    await loadWinners();
  }

  const cardDefs: { key: CardKey; label: string; icon: React.ElementType; color: string; clickable: boolean }[] = [
    { key: "members", label: "Total Members", icon: Users, color: "from-brand-500 to-brand-700", clickable: true },
    { key: "paid", label: "Payments Received", icon: Wallet, color: "from-emerald-400 to-emerald-600", clickable: true },
    { key: "unpaid", label: "Payment Pending", icon: CircleDollarSign, color: "from-rose-400 to-rose-600", clickable: true },
    { key: "present", label: "Present Members", icon: UserCheck, color: "from-indigo-400 to-indigo-600", clickable: true },
    { key: "absent", label: "Absent Members", icon: UserX, color: "from-orange-400 to-orange-600", clickable: true },
    { key: "winners", label: "Winners Declared", icon: Trophy, color: "from-amber-400 to-amber-600", clickable: true },
  ];
  if (portal === "master-admin") {
    cardDefs.push({ key: "admins", label: "Active Admins", icon: ShieldCheck, color: "from-slate-500 to-slate-700", clickable: true });
  }

  const showMonthTabs = activeCard === "paid" || activeCard === "unpaid" || activeCard === "present" || activeCard === "absent";
  const filteredMembers = getFilteredMembers();

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {cardDefs.map((c) => (
          <button
            key={c.key}
            onClick={() => openCard(c.key)}
            className={`card text-left transition ${c.clickable ? "cursor-pointer hover:shadow-soft" : "cursor-default"} ${
              activeCard === c.key ? "ring-2 ring-brand-500" : ""
            }`}
          >
            <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center text-white mb-3`}>
              <c.icon size={22} />
            </div>
            <p className="text-3xl font-bold text-ink-900">{counts[c.key]}</p>
            <p className="text-sm text-ink-700/60">{c.label}</p>
          </button>
        ))}
      </div>

      {activeCard && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-bold text-ink-900">{panelTitle()}</h2>
            <div className="flex items-center gap-2">
              {isStaff && (showMonthTabs || activeCard === "winners") && (
                <button
                  onClick={handleEdit}
                  className="bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
                  title="Edit in full section"
                >
                  <Pencil size={14} /> Edit
                </button>
              )}
              <button onClick={downloadPDF} className="btn-outline flex items-center gap-2 text-sm">
                <Download size={14} /> View / Download PDF
              </button>
              <button onClick={() => setActiveCard(null)} className="text-ink-700/50 hover:text-ink-900">
                <X size={20} />
              </button>
            </div>
          </div>

          {showMonthTabs && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => changeMonth(i)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    i === activeMonth ? "bg-brand-700 text-white shadow-soft" : "bg-brand-50 text-ink-700 border border-brand-100"
                  }`}
                >
                  Month {i + 1}
                </button>
              ))}
            </div>
          )}

          {loadingPanel ? (
            <p className="text-ink-700/50 text-sm py-6 text-center">Loading...</p>
          ) : activeCard === "winners" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-brand-800 border-b border-brand-100">
                    <th className="py-2 pr-4">Month</th>
                    <th className="py-2 pr-4">Alot No.</th>
                    <th className="py-2 pr-4">Member Name</th>
                    <th className="py-2 pr-4">Business/Designation</th>
                    {isStaff && <th className="py-2 pr-4">Edit</th>}
                  </tr>
                </thead>
                <tbody>
                  {winners.map((w) => (
                    <tr key={w.id} className="border-b border-brand-50">
                      <td className="py-2 pr-4">{w.month}</td>
                      <td className="py-2 pr-4">{w.members?.alot_number}</td>
                      <td className="py-2 pr-4 font-medium">{w.members?.member_name}</td>
                      <td className="py-2 pr-4">
                        {editingWinnerId === w.id ? (
                          <input
                            className="input py-1 text-sm w-48"
                            value={editWinnerValue}
                            onChange={(e) => setEditWinnerValue(e.target.value)}
                            autoFocus
                          />
                        ) : (
                          w.business_designation || <span className="text-ink-700/40">-</span>
                        )}
                      </td>
                      {isStaff && (
                        <td className="py-2 pr-4">
                          {editingWinnerId === w.id ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => saveWinnerDesignation(w.id)} className="text-emerald-600" title="Save">
                                <Check size={16} />
                              </button>
                              <button onClick={() => setEditingWinnerId(null)} className="text-ink-700/50" title="Cancel">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingWinnerId(w.id);
                                setEditWinnerValue(w.business_designation ?? "");
                              }}
                              className="text-brand-700"
                              title="Edit business/designation"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {winners.length === 0 && (
                    <tr><td colSpan={isStaff ? 5 : 4} className="py-6 text-center text-ink-700/50">No winners declared yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-brand-800 border-b border-brand-100">
                    <th className="py-2 pr-4">Alot No.</th>
                    <th className="py-2 pr-4">Member Name</th>
                    <th className="py-2 pr-4">District</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="border-b border-brand-50">
                      <td className="py-2 pr-4">{m.alot_number}</td>
                      <td className="py-2 pr-4 font-medium">{m.member_name}</td>
                      <td className="py-2 pr-4">{m.district}</td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr><td colSpan={3} className="py-6 text-center text-ink-700/50">No members in this list.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
