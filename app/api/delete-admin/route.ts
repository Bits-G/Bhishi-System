import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "master_admin") {
    return NextResponse.json({ error: "Only Master Admin can remove admins" }, { status: 403 });
  }

  const { admin_id } = await req.json();
  if (!admin_id) return NextResponse.json({ error: "admin_id required" }, { status: 400 });

  const admin = createAdminClient();
  // Deleting the auth user cascades to profiles (foreign key on delete cascade)
  const { error } = await admin.auth.admin.deleteUser(admin_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
