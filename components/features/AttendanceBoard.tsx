"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, UserCheck, UserX } from "lucide-react";

type Member = { id: number; member_name: string; alot_number: number };
type AttendanceRow = { id: number; member_id: number; month: string; status: "present" | "absent" };

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, i, 1); // adjust to your Bhishi's actual start year/month
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

export default function AttendanceBoard() {
  const supabase = createClient();
  const [activeMonth, setActiveMonth] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<Record<number, AttendanceRow>>({});
  const monthKey = MONTHS[activeMonth];

  useEffect(() => {
    supabase
      .from("members")
      .select("id, member_name, alot_number")
      .order("alot_number")
      .then(({ data }) => setMembers(data ?? []));
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [activeMonth]);

  async function loadAttendance() {
    const { data } = await supabase.from("attendance").select("*").eq("month", monthKey);
    const map: Record<number, AttendanceRow> = {};
    (data ?? []).forEach((r: AttendanceRow) => (map[r.member_id] = r));
    setRecords(map);
  }

  async function setStatus(member_id: number, status: "present" | "absent") {
    // upsert on conflict (member_id, month) — matches the unique constraint in schema.sql
    const { error } = await supabase
      .from("attendance")
      .upsert({ member_id, month: monthKey, status, marked_at: new Date().toISOString() }, { onConflict: "member_id,month" });
    if (error) {
      alert(error.message);
      return;
    }
    loadAttendance();
  }

  function downloadPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Bhishi Attendance — ${monthKey}`, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [["Alot No.", "Member Name", "Status"]],
      body: members.map((m) => [
        m.alot_number,
        m.member_name,
        (records[m.id]?.status ?? "absent").toUpperCase(),
      ]),
    });
    doc.save(`Bhishi-Attendance-${monthKey.replace(" ", "-")}.pdf`);
  }

  const presentCount = members.filter((m) => records[m.id]?.status === "present").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Attendance — {monthKey}</h1>
          <p className="text-ink-700/60 text-sm">
            {presentCount} present / {members.length - presentCount} absent (defaults to absent until marked)
          </p>
        </div>
        <button onClick={downloadPDF} className="btn-outline flex items-center gap-2">
          <Download size={16} /> View / Download PDF
        </button>
      </div>

      {/* Month tabs */}
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

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-800 border-b border-brand-100">
              <th className="py-2 pr-4">Alot No.</th>
              <th className="py-2 pr-4">Member Name</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const status = records[m.id]?.status ?? "absent";
              return (
                <tr key={m.id} className="border-b border-brand-50">
                  <td className="py-2 pr-4">{m.alot_number}</td>
                  <td className="py-2 pr-4 font-medium">{m.member_name}</td>
                  <td className="py-2 pr-4">
                    <span className={status === "present" ? "badge-paid" : "badge-unpaid"}>{status}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setStatus(m.id, "present")} className="text-emerald-600" title="Mark Present">
                        <UserCheck size={18} />
                      </button>
                      <button onClick={() => setStatus(m.id, "absent")} className="text-rose-600" title="Mark Absent">
                        <UserX size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
