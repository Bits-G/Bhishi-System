import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends a WhatsApp message via Meta's WhatsApp Cloud API.
 * FREE: first 1000 conversations/month, then paid per conversation.
 *
 * Setup required (do this after core system is working):
 * 1. Go to https://developers.facebook.com/apps -> Create App -> "Business" type
 * 2. Add the "WhatsApp" product to the app
 * 3. Copy your "Temporary access token" and "Phone number ID" from the WhatsApp > 
 *    API Setup screen (for testing). For production, generate a permanent token.
 * 4. Add these to .env.local:
 *      WHATSAPP_TOKEN=your-access-token
 *      WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
 * 5. In Meta's test setup, you must first add the recipient's number as a
 *    "verified test recipient" OR use an approved message template for
 *    production numbers that haven't messaged you first (WhatsApp policy).
 */

export async function POST(req: NextRequest) {
  // Only logged-in admin/master_admin can trigger notifications
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { to, message } = await req.json();
  if (!to || !message) {
    return NextResponse.json({ error: "to (phone number) and message are required" }, { status: 400 });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return NextResponse.json(
      { error: "WhatsApp API not configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID to .env.local" },
      { status: 400 }
    );
  }

  // 'to' should be in international format without '+', e.g. 91XXXXXXXXXX
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data?.error?.message ?? "Failed to send" }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}
