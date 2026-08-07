"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";

type MemberRow = {
  sr_no: number;
  district: string;
  member_name: string;
  dob: string; // stored as ISO YYYY-MM-DD once parsed, "" if unknown/invalid
  whatsapp_no: string;
  mobile_no: string;
  alot_number: number;
};

// Matches a column header regardless of case, spaces, dots, or dashes.
// "Sr.no.", "SR NO", "sr_no" and "Sr No" all normalize to "srno".
function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findValue(row: Record<string, any>, ...possibleNames: string[]) {
  const normalizedRow: Record<string, any> = {};
  for (const k of Object.keys(row)) normalizedRow[normalizeKey(k)] = row[k];
  for (const name of possibleNames) {
    const val = normalizedRow[normalizeKey(name)];
    if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
  }
  return "";
}

// Converts common Indian date formats (DD-MM-YYYY, DD/MM/YYYY) and Excel serial
// dates into ISO YYYY-MM-DD, which Postgres' `date` column requires.
function parseDob(raw: string): string {
  if (!raw) return "";

  // Excel sometimes gives a serial number (e.g. 33123) when the cell is formatted as a date
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    const parsed = XLSX.SSF?.parse_date_code ? XLSX.SSF.parse_date_code(serial) : null;
    if (parsed) {
      const mm = String(parsed.m).padStart(2, "0");
      const dd = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${mm}-${dd}`;
    }
  }

  // Already ISO: 1990-08-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return ""; // unrecognized format — leave blank rather than send bad data to Postgres
}

export default function MembersImportPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [existingCount, setExistingCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.from("members").select("*", { count: "exact", head: true }).then(({ count }) => {
      setExistingCount(count ?? 0);
    });
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary", cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (json.length === 0) {
        setErrors(["No rows found in this file. Make sure the first row has column headers and data starts from row 2."]);
        setRows([]);
        return;
      }

      const foundWarnings: string[] = [];

      const parsed: MemberRow[] = json.map((r, i) => {
        const rawDob = findValue(r, "DOB", "Date of Birth");
        const dob = parseDob(rawDob);
        if (rawDob && !dob) foundWarnings.push(`Row ${i + 1}: DOB "${rawDob}" not recognized — left blank. Use DD-MM-YYYY.`);

        return {
          sr_no: Number(findValue(r, "Sr.no.", "Sr no", "sr_no", "Sr")) || 0,
          district: findValue(r, "district"),
          member_name: findValue(r, "Member Name", "member_name", "Name"),
          dob,
          whatsapp_no: findValue(r, "whatsapp no.", "WhatsApp No", "whatsapp_no", "whatsapp"),
          mobile_no: findValue(r, "Mobile No.", "mobile_no", "Mobile"),
          alot_number: Number(findValue(r, "alot-number", "Alot Number", "alot_number", "alotment number")) || 0,
        };
      });

      const foundErrors: string[] = [];
      const seenAlot = new Set<number>();
      parsed.forEach((r, i) => {
        if (!r.member_name) foundErrors.push(`Row ${i + 1}: Member Name is missing`);
        if (!r.alot_number) foundErrors.push(`Row ${i + 1}: Alot Number is missing`);
        if (r.alot_number && seenAlot.has(r.alot_number)) foundErrors.push(`Row ${i + 1}: Duplicate Alot Number ${r.alot_number} in this file`);
        seenAlot.add(r.alot_number);
      });

      setRows(parsed);
      setErrors(foundErrors);
      setWarnings(foundWarnings);
      setDone(false);
    };
    reader.readAsBinaryString(file);
  }

  async function confirmImport() {
    if (errors.length > 0) return;
    setImporting(true);
    const payload = rows.map((r) => ({
      sr_no: r.sr_no,
      district: r.district,
      member_name: r.member_name,
      dob: r.dob || null,
      whatsapp_no: r.whatsapp_no,
      mobile_no: r.mobile_no,
      alot_number: r.alot_number,
    }));
    const { error } = await supabase.from("members").upsert(payload, { onConflict: "alot_number" });
    setImporting(false);
    if (error) {
      setErrors([`Database error: ${error.message}`]);
      return;
    }
    setDone(true);
    setRows([]);
    setWarnings([]);
    const { count } = await supabase.from("members").select("*", { count: "exact", head: true });
    setExistingCount(count ?? 0);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Import Members</h1>
      <p className="text-ink-700/60 mb-6">
        Upload the 156-member CSV/XLSX file. Currently <b>{existingCount}</b> members in database.
      </p>

      <div className="card mb-6">
        <p className="font-semibold mb-2">Expected columns (header row, order doesn't matter):</p>
        <code className="text-xs bg-brand-50 px-2 py-1 rounded block mb-4 overflow-x-auto">
          Sr.no. | district | Member Name | DOB | whatsapp no. | Mobile No. | alot-number
        </code>
        <p className="text-xs text-ink-700/50 mb-4">DOB format: DD-MM-YYYY (e.g. 15-08-1990) or DD/MM/YYYY.</p>
        <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
          <Upload size={18} /> Choose CSV / XLSX File
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {errors.length > 0 && (
        <div className="card border-rose-300 bg-rose-50 mb-6">
          <p className="font-semibold text-rose-700 flex items-center gap-2 mb-2">
            <AlertTriangle size={18} /> Fix these before importing:
          </p>
          <ul className="text-sm text-rose-700 list-disc pl-5 space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="card border-amber-300 bg-amber-50 mb-6">
          <p className="font-semibold text-amber-700 flex items-center gap-2 mb-2">
            <AlertTriangle size={18} /> Warnings (import will still proceed):
          </p>
          <ul className="text-sm text-amber-700 list-disc pl-5 space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && errors.length === 0 && (
        <div className="card mb-6">
          <p className="font-semibold mb-3">Preview ({rows.length} rows)</p>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 sticky top-0">
                <tr>
                  {["Sr.no", "District", "Name", "DOB", "WhatsApp", "Mobile", "Alot No."].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-brand-800">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-brand-100">
                    <td className="px-3 py-1.5">{r.sr_no}</td>
                    <td className="px-3 py-1.5">{r.district}</td>
                    <td className="px-3 py-1.5">{r.member_name}</td>
                    <td className="px-3 py-1.5">{r.dob || <span className="text-ink-700/40">—</span>}</td>
                    <td className="px-3 py-1.5">{r.whatsapp_no}</td>
                    <td className="px-3 py-1.5">{r.mobile_no}</td>
                    <td className="px-3 py-1.5">{r.alot_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={confirmImport} disabled={importing} className="btn-primary mt-4">
            {importing ? "Importing..." : `Confirm Import (${rows.length} members)`}
          </button>
        </div>
      )}

      {done && (
        <div className="card border-emerald-300 bg-emerald-50 flex items-center gap-2 text-emerald-700 font-medium">
          <CheckCircle2 size={20} /> Members imported successfully!
        </div>
      )}
    </div>
  );
}

