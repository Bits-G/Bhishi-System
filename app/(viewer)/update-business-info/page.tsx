"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, ShieldCheck, CheckCircle2, AlertTriangle, ArrowLeft, Briefcase, Plus, Pencil } from "lucide-react";

type MemberHit = { id: number; alot_number: number; member_name: string; district: string };
type Entry = {
  id: number;
  member_id: number;
  info_type: "work" | "business" | "both";
  work_name?: string;
  work_role?: string;
  business_name?: string;
  business_role?: string;
  business_mobile_no?: string;
  place?: string;
  business_area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  work_status?: string;
  additional_info?: string;
};

const STATUS_OPTIONS = [
  "Working / Employed",
  "Business / Self-Employed",
  "Freelancer",
  "Student",
  "Retired",
  "Not Currently Working",
  "Homemaker",
  "Other",
];

function UpdateBusinessInfoInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const presetAlot = searchParams.get("alot"); // set when arriving from inside a folder — skips the search step

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<MemberHit | null>(null);
  const [mobile, setMobile] = useState("");
  const [verifyError, setVerifyError] = useState("");

  const [existingEntries, setExistingEntries] = useState<Entry[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<number | "new" | null>(null);

  const [infoType, setInfoType] = useState<"work" | "business" | "both" | "">("");
  const [workName, setWorkName] = useState("");
  const [workRole, setWorkRole] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessRole, setBusinessRole] = useState("");
  const [businessMobile, setBusinessMobile] = useState("");
  const [place, setPlace] = useState("");
  const [businessArea, setBusinessArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [workStatus, setWorkStatus] = useState("");
  const [otherStatus, setOtherStatus] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // Arrived from inside a folder (?alot=42) — look that member up directly, skip search.
  useEffect(() => {
    if (!presetAlot) return;
    supabase
      .from("members")
      .select("id, alot_number, member_name, district")
      .eq("alot_number", Number(presetAlot))
      .single()
      .then(({ data }) => {
        if (data) setSelected(data);
      });
  }, [presetAlot]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("members")
      .select("id, alot_number, member_name, district")
      .or(`member_name.ilike.%${query}%,district.ilike.%${query}%,alot_number.eq.${Number(query) || 0}`)
      .order("alot_number")
      .limit(10);
    setResults(data ?? []);
    setSearching(false);
  }

  function selectMember(m: MemberHit) {
    setSelected(m);
    setResults([]);
  }

  async function loadExistingEntries(memberId: number) {
    const { data } = await supabase.from("business_directory").select("*").eq("member_id", memberId);
    setExistingEntries(data ?? []);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError("");
    if (!selected) return;
    const { data } = await supabase.from("members").select("mobile_no").eq("id", selected.id).single();
    const normalizedInput = mobile.replace(/\D/g, "").slice(-10);
    const normalizedStored = String(data?.mobile_no ?? "").replace(/\D/g, "").slice(-10);
    if (!normalizedStored || normalizedStored !== normalizedInput) {
      setVerifyError("Mobile Number does not match our records for this member. Please check and try again, or contact the admin.");
      return;
    }
    setVerifyError("__verified__");
    await loadExistingEntries(selected.id);
  }

  const verified = verifyError === "__verified__";

  function resetForm() {
    setInfoType(""); setWorkName(""); setWorkRole(""); setBusinessName(""); setBusinessRole("");
    setBusinessMobile(""); setPlace(""); setBusinessArea(""); setLandmark(""); setCity(""); setState("");
    setPincode(""); setWorkStatus(""); setOtherStatus(""); setAdditionalInfo(""); setConfirmed(false);
  }

  function startAddNew() {
    resetForm();
    setEditingEntryId("new");
  }

  function startEdit(entry: Entry) {
    setInfoType(entry.info_type);
    setWorkName(entry.work_name ?? "");
    setWorkRole(entry.work_role ?? "");
    setBusinessName(entry.business_name ?? "");
    setBusinessRole(entry.business_role ?? "");
    setBusinessMobile(entry.business_mobile_no ?? "");
    setPlace(entry.place ?? "");
    setBusinessArea(entry.business_area ?? "");
    setLandmark(entry.landmark ?? "");
    setCity(entry.city ?? "");
    setState(entry.state ?? "");
    setPincode(entry.pincode ?? "");
    const status = entry.work_status ?? "";
    if (status && !STATUS_OPTIONS.includes(status)) {
      setWorkStatus("Other");
      setOtherStatus(status);
    } else {
      setWorkStatus(status);
    }
    setAdditionalInfo(entry.additional_info ?? "");
    setConfirmed(false);
    setEditingEntryId(entry.id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !confirmed) return;
    setSubmitting(true);
    setSubmitError("");

    const res = await fetch("/api/business-directory/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: selected.id,
        mobile_no: mobile,
        entry_id: typeof editingEntryId === "number" ? editingEntryId : undefined,
        info_type: infoType,
        work_name: workName,
        work_role: workRole,
        business_name: businessName,
        business_role: businessRole,
        business_mobile_no: businessMobile,
        place,
        business_area: businessArea,
        landmark,
        city,
        state,
        pincode,
        work_status: workStatus === "Other" ? otherStatus : workStatus,
        additional_info: additionalInfo,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
        <h1 className="text-xl font-bold text-ink-900">Saved!</h1>
        <p className="text-ink-700/60 mt-1">Your business/work info is now live in the Business Directory.</p>
        <a href="/business-directory" className="btn-primary inline-block mt-6">View Business Directory</a>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <a href="/business-directory" className="text-brand-700 text-sm font-medium flex items-center gap-1 mb-4 hover:underline w-fit">
        <ArrowLeft size={16} /> Back to Business Directory
      </a>

      <div className="text-center mb-6">
        <Briefcase size={32} className="mx-auto text-brand-600 mb-2" />
        <h1 className="text-2xl font-bold text-ink-900">Wani Summit – Member Work Information Form</h1>
        <p className="text-ink-700/60 text-sm mt-1">Add or update your own work/business listings.</p>
      </div>

      {/* Search step — only shown if we didn't arrive with a known member (?alot=) */}
      {!selected && !presetAlot && (
        <form onSubmit={handleSearch} className="card space-y-3">
          <label className="text-sm font-medium text-ink-800">Find your record</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-brand-400" size={16} />
            <input
              className="input pl-9"
              placeholder="Allotment Number, or your Full Name (Surname Name Father's Name)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" disabled={searching} className="btn-primary w-full">
            {searching ? "Searching..." : "Search"}
          </button>
          {results.length > 0 && (
            <div className="border border-brand-100 rounded-lg divide-y divide-brand-50 mt-2">
              {results.map((m) => (
                <button key={m.id} type="button" onClick={() => selectMember(m)} className="w-full text-left px-3 py-2 hover:bg-brand-50 text-sm">
                  <span className="font-medium">{m.member_name}</span>{" "}
                  <span className="text-ink-700/50">— Alot No {m.alot_number}, {m.district}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      )}

      {/* Verify step */}
      {selected && !verified && (
        <div className="card space-y-3">
          {!presetAlot && (
            <button type="button" onClick={() => { setSelected(null); setMobile(""); setVerifyError(""); }} className="text-brand-700 text-sm font-medium flex items-center gap-1 hover:underline">
              <ArrowLeft size={14} /> Not you? Search again
            </button>
          )}
          <p className="text-sm text-ink-800">
            Alot No <b>{selected.alot_number}</b> — <b>{selected.member_name}</b>, {selected.district}
          </p>
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-ink-800">Verify with your Mobile Number</label>
              <input required className="input mt-1" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="The number on your member record" />
            </div>
            {verifyError && verifyError !== "__verified__" && (
              <p className="text-rose-600 text-sm flex items-center gap-1.5"><AlertTriangle size={14} /> {verifyError}</p>
            )}
            <button type="submit" className="btn-primary w-full">Verify</button>
          </form>
        </div>
      )}

      {/* After verification: pick an existing listing to edit, or add a new one */}
      {selected && verified && editingEntryId === null && (
        <div className="space-y-3">
          <p className="text-sm text-ink-800 card !py-3">
            Alot No <b>{selected.alot_number}</b> — <b>{selected.member_name}</b>
          </p>
          {existingEntries.map((entry) => (
            <button key={entry.id} onClick={() => startEdit(entry)} className="card w-full text-left flex items-center justify-between hover:shadow-soft">
              <div>
                <p className="text-xs font-semibold text-brand-600 uppercase">{entry.info_type}</p>
                <p className="font-medium text-ink-900">{entry.work_name || entry.business_name || "Untitled listing"}</p>
              </div>
              <Pencil size={16} className="text-brand-700" />
            </button>
          ))}
          <button onClick={startAddNew} className="card w-full border-2 border-dashed border-brand-300 text-brand-700 flex items-center justify-center gap-2 py-6 hover:bg-brand-50">
            <Plus size={18} /> Add Another Business / Work / Service
          </button>
        </div>
      )}

      {/* The actual add/edit form */}
      {selected && verified && editingEntryId !== null && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <button type="button" onClick={() => setEditingEntryId(null)} className="text-brand-700 text-sm font-medium flex items-center gap-1 hover:underline">
            <ArrowLeft size={14} /> Back to your listings
          </button>
          <p className="text-sm text-ink-800">
            {editingEntryId === "new" ? "Adding a new listing for" : "Editing a listing for"} <b>{selected.member_name}</b>
          </p>

          <div>
            <label className="text-sm font-medium text-ink-800">What would you like to add? *</label>
            <div className="flex gap-4 mt-1 text-sm">
              {(["work", "business", "both"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-1.5">
                  <input type="radio" name="infoType" checked={infoType === opt} onChange={() => setInfoType(opt)} />
                  {opt === "work" ? "Work" : opt === "business" ? "Business" : "Both"}
                </label>
              ))}
            </div>
          </div>

          {(infoType === "work" || infoType === "both") && (
            <>
              <input className="input" placeholder="Work Name / Organization (company, shop, etc.)" value={workName} onChange={(e) => setWorkName(e.target.value)} />
              <input className="input" placeholder="Your Role (e.g. Software Engineer, Teacher, Manager, Doctor)" value={workRole} onChange={(e) => setWorkRole(e.target.value)} />
            </>
          )}
          {(infoType === "business" || infoType === "both") && (
            <>
              <input className="input" placeholder="Full Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              <input className="input" placeholder="Your Business Role (e.g. Owner, Partner, Manager, Worker, Employee)" value={businessRole} onChange={(e) => setBusinessRole(e.target.value)} />
              <input className="input" placeholder="Business Mobile Number *" value={businessMobile} onChange={(e) => setBusinessMobile(e.target.value)} required />
            </>
          )}

          {infoType && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-800">Work / Business Address *</label>
              <input className="input" placeholder="Place" value={place} onChange={(e) => setPlace(e.target.value)} required />
              <input className="input" placeholder="Business Area" value={businessArea} onChange={(e) => setBusinessArea(e.target.value)} />
              <input className="input" placeholder="Nearby Landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
                <input className="input" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} required />
              </div>
              <input className="input" placeholder="Pin Code" value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-ink-800">Your Current Work Status *</label>
            <select required className="input mt-1" value={workStatus} onChange={(e) => setWorkStatus(e.target.value)}>
              <option value="">Select one...</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {workStatus === "Other" && (
              <input className="input mt-2" placeholder="Please specify" value={otherStatus} onChange={(e) => setOtherStatus(e.target.value)} required />
            )}
          </div>

          <textarea className="input min-h-[80px]" placeholder="Additional Information (optional)" value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} />

          <label className="flex items-start gap-2 text-sm text-ink-800">
            <input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
            I confirm that the information provided above is correct.
          </label>

          {submitError && <p className="text-rose-600 text-sm flex items-center gap-1.5"><AlertTriangle size={14} /> {submitError}</p>}

          <button type="submit" disabled={submitting || !infoType} className="btn-primary w-full">
            {submitting ? "Saving..." : editingEntryId === "new" ? "ADD LISTING" : "SAVE CHANGES"}
          </button>

          <p className="text-xs text-ink-700/50 flex items-center gap-1.5 pt-1">
            <ShieldCheck size={13} /> Only your own record can be changed. This does not give admin access.
          </p>
        </form>
      )}
    </div>
  );
}

export default function UpdateBusinessInfoPage() {
  return (
    <Suspense fallback={<p className="text-center text-ink-700/50 py-10">Loading...</p>}>
      <UpdateBusinessInfoInner />
    </Suspense>
  );
}
