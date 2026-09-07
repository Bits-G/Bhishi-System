import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const upper = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase() : v);

/**
 * Handles both:
 * - Creating a member's FIRST folder (root "Add or update your own listing here"
 *   flow — identifies the member via alot_number, since no folder exists yet to
 *   have arrived from).
 * - Adding another listing, or editing an existing one, from INSIDE that
 *   member's folder — identifies the member directly via member_id (no need to
 *   search again, since being inside the folder already proves that).
 *
 * Either way, mobile_no must match that exact member's record before anything
 * is written. If entry_id is provided, it must belong to the verified member —
 * this stops anyone from editing another member's listing by guessing an id.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { alot_number, member_id: rawMemberId, mobile_no, entry_id, ...fields } = body;

  if ((!alot_number && !rawMemberId) || !mobile_no) {
    return NextResponse.json({ error: "Member identity and Mobile Number are required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const normalizedInput = String(mobile_no).replace(/\D/g, "").slice(-10);

  const memberQuery = admin.from("members").select("id, mobile_no");
  const { data: member, error: findError } = rawMemberId
    ? await memberQuery.eq("id", Number(rawMemberId)).single()
    : await memberQuery.eq("alot_number", Number(alot_number)).single();

  if (findError || !member) {
    return NextResponse.json({ error: "No matching member found." }, { status: 404 });
  }

  const normalizedStored = String(member.mobile_no ?? "").replace(/\D/g, "").slice(-10);
  if (!normalizedStored || normalizedStored !== normalizedInput) {
    return NextResponse.json({ error: "Mobile Number does not match our records for this member." }, { status: 403 });
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

  if (entry_id) {
    // Editing an existing listing — confirm it actually belongs to this member first.
    const { data: existing } = await admin.from("business_directory").select("member_id").eq("id", entry_id).single();
    if (!existing || existing.member_id !== member.id) {
      return NextResponse.json({ error: "That listing does not belong to this member." }, { status: 403 });
    }
    const { error: updateError } = await admin.from("business_directory").update(payload).eq("id", entry_id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  } else {
    // New listing — a member can have any number of these now.
    const { error: insertError } = await admin.from("business_directory").insert(payload);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, member_id: member.id });
}
