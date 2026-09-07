import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Self-service submit/update endpoint for the Business Directory.
 * No login required — verification happens by proving you know the Alot Number
 * (or picked yourself from a name/district search) AND the mobile number on
 * file for that exact member record.
 *
 * Safety:
 * - Uses the service-role key server-side only.
 * - Re-verifies alot_number + mobile_no match on the server (never trusts a
 *   "verified" flag sent from the browser).
 * - The upsert payload only ever touches business_directory columns for ONE
 *   member_id — no other table, no other member, no way to escalate.
 * - All free-text fields are uppercased server-side, so the stored data is
 *   consistent no matter what case the person typed in.
 */

const upper = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase() : v);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { alot_number, mobile_no, ...fields } = body;

  if (!alot_number || !mobile_no) {
    return NextResponse.json({ error: "Alot Number and Mobile Number are required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const normalizedInput = String(mobile_no).replace(/\D/g, "").slice(-10);

  const { data: member, error: findError } = await admin
    .from("members")
    .select("id, mobile_no")
    .eq("alot_number", Number(alot_number))
    .single();

  if (findError || !member) {
    return NextResponse.json({ error: "No member found with that Alot Number." }, { status: 404 });
  }

  const normalizedStored = String(member.mobile_no ?? "").replace(/\D/g, "").slice(-10);
  if (!normalizedStored || normalizedStored !== normalizedInput) {
    return NextResponse.json({ error: "Mobile Number does not match our records for this Alot Number." }, { status: 403 });
  }

  const payload = {
    member_id: member.id,
    info_type: fields.info_type,
    work_name: upper(fields.work_name) || null,
    work_role: upper(fields.work_role) || null,
    business_name: upper(fields.business_name) || null,
    business_role: upper(fields.business_role) || null,
    business_mobile_no: fields.business_mobile_no || null,
    place: upper(fields.place) || null,
    business_area: upper(fields.business_area) || null,
    landmark: upper(fields.landmark) || null,
    city: upper(fields.city) || null,
    state: upper(fields.state) || null,
    pincode: fields.pincode || null,
    work_status: upper(fields.work_status) || null,
    additional_info: upper(fields.additional_info) || null,
    updated_at: new Date().toISOString(),
  };

  if (!payload.info_type || !["work", "business", "both"].includes(payload.info_type)) {
    return NextResponse.json({ error: "Please select Work, Business, or Both." }, { status: 400 });
  }

  const { error: upsertError } = await admin.from("business_directory").upsert(payload, { onConflict: "member_id" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
