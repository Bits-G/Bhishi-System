"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createPdfDoc, PDF_FONT_NAME } from "@/lib/pdf/createDoc";
import { Download, UserCheck, UserX, Search } from "lucide-react";

type Member = { id: number; member_name: string; alot_number: number; district?: string };
type AttendanceRow = { id: number; member_id: number; month: string; status: "present" | "absent" };

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 7 + i, 1); // Aug 2026 -> July 2027
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

export default function AttendanceBoard() {
  const supabase = createClient();
  const [activeMonth, setActiveMonth] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<number, AttendanceRow>>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const monthKey = MONTHS[activeMonth];

  useEffect(() => {
    supabase
      .from("members")
      .select("id, member_name, alot_number, district")
      .order("alot_number")
      .then(({ data }) => setMembers(data ?? []));
  }, []);

  useEffect(() => {
    loadAttendance();
    setSelected(new Set());
  }, [activeMonth]);

  async function loadAttendance() {
    const { data } = await supabase.from("attendance").select("*").eq("month", monthKey);
    const map: Record<number, AttendanceRow> = {};
    (data ?? []).forEach((a: AttendanceRow) => (map[a.member_id] = a));
    setAttendance(map);
  }

  async function setStatus(member_id: number, status: "present" | "absent") {
    const { error } = await supabase
      .from("attendance")
      .upsert({ member_id, month: monthKey, status }, { onConflict: "member_id,month" });
    if (error) {
      alert(error.message);
      return;
    }
    loadAttendance();
  }

  async function setBulkStatus(status: "present" | "absent") {
    if (selected.size === 0) return;
    setBulkSaving(true);
    const rows = Array.from(selected).map((member_id) => ({ member_id, month: monthKey, status }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "member_id,month" });
    setBulkSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSelected(new Set());
    loadAttendance();
  }

  async function downloadPDF() {
    const doc = await createPdfDoc();
    doc.setFontSize(16);
    doc.text(`Wani Summit Attendance — ${monthKey}`, 14, 15);
    autoTable(doc, {
      startY: 22,
      styles: { font: PDF_FONT_NAME },
      headStyles: { font: PDF_FONT_NAME },
      head: [["Alot No.", "Member Name", "Status"]],
      body: members.map((m) => [
        m.alot_number,
        m.member_name,
        (attendance[m.id]?.status ?? "absent").toUpperCase(),
      ]),
    });
    doc.save(`WaniSummit-Attendance-${monthKey.replace(" ", "-")}.pdf`);
  }

  const filtered = members.filter(
    (m) =>
      m.member_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(m.alot_number).includes(search) ||
      m.district?.toLowerCase().includes(search.toLowerCase())
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((m) => next.delete(m.id));
      else filtered.forEach((m) => next.add(m.id));
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Attendance — {monthKey}</h1>
          <p className="text-ink-700/60 text-sm">
            Members with no record yet default to Absent until marked Present.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <button
                onClick={() => setBulkStatus("present")}
                disabled={bulkSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
                title={`Mark ${selected.size} selected as Present`}
              >
                <UserCheck size={14} /> Present ({selected.size})
              </button>
              <button
                onClick={() => setBulkStatus("absent")}
                disabled={bulkSaving}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
                title={`Mark ${selected.size} selected as Absent`}
              >
                <UserX size={14} /> Absent ({selected.size})
              </button>
            </>
          )}
          <button onClick={downloadPDF} className="btn-outline flex items-center gap-2">
            <Download size={16} /> View / Download PDF
          </button>
        </div>
      </div>

      {/* Month tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
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

      {/* Search bar — sits right under the View/Download PDF button, top-right */}
      <div className="flex justify-end mb-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 text-brand-400" size={16} />
          <input
            className="input pl-9"
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
              <th className="py-2 pr-4">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="w-4 h-4 accent-brand-700" />
              </th>
              <th className="py-2 pr-4">Alot No.</th>
              <th className="py-2 pr-4">Member Name</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Mark</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const status = attendance[m.id]?.status ?? "absent";
              return (
                <tr key={m.id} className={`border-b border-brand-50 ${selected.has(m.id) ? "bg-brand-50/50" : ""}`}>
                  <td className="py-2 pr-4">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleOne(m.id)}
                      className="w-4 h-4 accent-brand-700"
                    />
                  </td>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink-700/50">No members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
