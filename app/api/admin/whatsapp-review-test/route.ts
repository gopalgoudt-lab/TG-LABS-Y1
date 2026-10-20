import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Restricted App Review test-message endpoint.
 * Disabled by default. Never uses the coexistence/production number.
 */
export async function POST(request: Request) {
  const unavailable = () => NextResponse.json({ error: "Test messaging is not enabled." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (process.env.WHATSAPP_REVIEW_TEST_ENABLED !== "true") return unavailable();

  const origin = request.headers.get("origin");
  const expectedOrigin = process.env.WHATSAPP_REVIEW_TEST_ORIGIN;
  if (!origin || !expectedOrigin || origin !== expectedOrigin) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  const cookie = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1];
  if (!cookie) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  try {
    const admin = await verifyAdminSessionToken(decodeURIComponent(cookie));
    // Existing ADMIN role is broader than Super Admin. Enforce a separate exact UID gate.
    const superAdminUid = process.env.WHATSAPP_REVIEW_SUPER_ADMIN_UID;
    if (!superAdminUid || admin.uid !== superAdminUid) {
      return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const phoneId = process.env.WHATSAPP_REVIEW_TEST_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_REVIEW_TEST_ACCESS_TOKEN;
  const recipient = process.env.WHATSAPP_REVIEW_TEST_RECIPIENT;
  if (!phoneId || !token || !recipient || !/^\\d{7,15}$/.test(recipient) || !/^\\d+$/.test(phoneId)) return unavailable();

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || (body as { confirm?: unknown }).confirm !== "SEND_REVIEW_TEST") {
    return NextResponse.json({ error: "Explicit test confirmation required." }, { status: 400 });
  }

  // Fixed recipient, fixed content and test sender: no arbitrary number/message injection.
  try {
    const response = await fetch(`https://graph.facebook.com/v23.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        type: "template",
        template: { name: "hello_world", language: { code: "en_US" } },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      console.warn("WhatsApp App Review test send rejected", { status: response.status });
      return NextResponse.json({ error: "Meta rejected the test message.", metaStatus: response.status }, { status: 502 });
    }
    // Never return or log tokens, recipient numbers, or message identifiers.
    return NextResponse.json({ ok: true, detail: "Meta accepted the test-message request. Verify delivery on the test recipient device." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to reach Meta." }, { status: 502 });
  }
}
