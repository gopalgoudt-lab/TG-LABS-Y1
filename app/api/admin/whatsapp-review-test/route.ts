import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
  let adminUid = "";
  try {
    const admin = await verifyAdminSessionToken(decodeURIComponent(cookie));
    // Existing ADMIN role is broader than Super Admin. Enforce a separate exact UID gate.
    adminUid = admin.uid;
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

  // Fail closed if the sender is any known TG LABS WABA phone, including unverified entries.
  if (["1209018948971017", "1349830611552211", "1318642631325485"].includes(phoneId)) return unavailable();

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || (body as { confirm?: unknown }).confirm !== "SEND_REVIEW_TEST") {
    return NextResponse.json({ error: "Explicit test confirmation required." }, { status: 400 });
  }

  // Persistent audit-backed rate gate. Fail closed if the database is unavailable.
  const auditPhone = "WA_REVIEW_TEST:" + adminUid;
  try {
    const recent = await prisma.adminAuditLog.count({ where: { adminPhone: auditPhone, action: "WHATSAPP_REVIEW_TEST_ATTEMPT", createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
    if (recent >= 3) return NextResponse.json({ error: "Test limit reached (3 attempts per hour)." }, { status: 429 });
    await prisma.adminAuditLog.create({ data: { adminPhone: auditPhone, action: "WHATSAPP_REVIEW_TEST_ATTEMPT", entityType: "WHATSAPP_TEST", summary: "Super Admin initiated fixed-recipient Meta test message.", ipAddress: "restricted", userAgent: null } });
  } catch {
    return NextResponse.json({ error: "Test audit unavailable; sending blocked." }, { status: 503 });
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
