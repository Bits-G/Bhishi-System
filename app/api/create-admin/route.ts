import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // 1. Confirm the caller is a logged-in master_admin
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
    return NextResponse.json({ error: "Only Master Admin can create admins" }, { status: 403 });
  }

  // 2. Create the new admin's auth user using the service role (admin) client
  const { full_name, email, password } = await req.json();
  if (!full_name || !email || !password) {
    return NextResponse.json({ error: "full_name, email, and password are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message ?? "Could not create user" }, { status: 400 });
  }

  // 3. Insert profile row with role='admin'
  const { error: profileError } = await admin.from("profiles").insert({
    id: newUser.user.id,
    full_name,
    role: "admin",
    created_by: user.id,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, id: newUser.user.id });
}
