"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, CheckCircle2, XCircle, Pencil, Search } from "lucide-react";

type Member = { id: number; member_name: string; alot_number: number; district?: string };
type Payment = { id: number; member_id: number; month: string; status: "paid" | "unpaid"; amount: number };

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 7 + i, 1); // Aug 2026 -> July 2027 (Wani Summit financial year)
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

export default function PaymentsBoard() {
  const supabase = createClient();
  const [activeMonth, setActiveMonth] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Record<number, Payment>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<number>(10000);
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
    loadPayments();
    setSelected(new Set());
  }, [activeMonth]);

  async function loadPayments() {
    const { data } = await supabase.from("payments").select("*").eq("month", monthKey);
    const map: Record<number, Payment> = {};
    (data ?? []).forEach((p: Payment) => (map[p.member_id] = p));
    setPayments(map);
  }

  async function setStatus(member_id: number, status: "paid" | "unpaid") {
    const existing = payments[member_id];
    if (existing) {
      await supabase.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("payments").insert({ member_id, month: monthKey, status, amount: 10000 });
    }
    loadPayments();
  }

  async function setBulkStatus(status: "paid" | "unpaid") {
    if (selected.size === 0) return;
    setBulkSaving(true);
    const rows = Array.from(selected).map((member_id) => ({ member_id, month: monthKey, status }));
    // amount is intentionally left out of the payload so upsert doesn't reset any custom amount already set
    const { error } = await supabase.from("payments").upsert(rows, { onConflict: "member_id,month" });
    setBulkSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSelected(new Set());
    loadPayments();
  }

  async function saveAmount(member_id: number) {
    const existing = payments[member_id];
    if (existing) {
      await supabase.from("payments").update({ amount: editAmount }).eq("id", existing.id);
    } else {
      await supabase.from("payments").insert({ member_id, month: monthKey, status: "unpaid", amount: editAmount });
    }
    setEditingId(null);
    loadPayments();
  }

  function downloadPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Wani Summit Payments — ${monthKey}`, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [["Alot No.", "Member Name", "Amount", "Status"]],
      body: members.map((m) => [
        m.alot_number,
        m.member_name,
        `Rs. ${payments[m.id]?.amount ?? 10000}`,
        (payments[m.id]?.status ?? "unpaid").toUpperCase(),
      ]),
    });
    doc.save(`WaniSummit-Payments-${monthKey.replace(" ", "-")}.pdf`);
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
          <h1 className="text-2xl font-bold text-ink-900">Payments — {monthKey}</h1>
          <p className="text-ink-700/60 text-sm">₹10,000 per member per month × 12 months</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <button
                onClick={() => setBulkStatus("paid")}
                disabled={bulkSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
                title={`Mark ${selected.size} selected as Paid`}
              >
                <CheckCircle2 size={14} /> Paid ({selected.size})
              </button>
              <button
                onClick={() => setBulkStatus("unpaid")}
                disabled={bulkSaving}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1"
                title={`Mark ${selected.size} selected as Unpaid`}
              >
                <XCircle size={14} /> Unpaid ({selected.size})
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
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const p = payments[m.id];
              const status = p?.status ?? "unpaid";
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
                    {editingId === m.id ? (
                      <input
                        type="number"
                        className="input w-28"
                        value={editAmount}
                        onChange={(e) => setEditAmount(Number(e.target.value))}
                      />
                    ) : (
                      `₹${p?.amount ?? 10000}`
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={status === "paid" ? "badge-paid" : "badge-unpaid"}>{status}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setStatus(m.id, "paid")} className="text-emerald-600" title="Mark Paid">
                        <CheckCircle2 size={18} />
                      </button>
                      <button onClick={() => setStatus(m.id, "unpaid")} className="text-rose-600" title="Mark Unpaid">
                        <XCircle size={18} />
                      </button>
                      {editingId === m.id ? (
                        <button onClick={() => saveAmount(m.id)} className="text-brand-700 text-xs font-semibold">
                          Save
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(m.id);
                            setEditAmount(p?.amount ?? 10000);
                          }}
                          className="text-brand-700"
                          title="Edit Amount"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-700/50">No members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

