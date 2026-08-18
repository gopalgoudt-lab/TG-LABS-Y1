import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Meta calls this endpoint when the WhatsApp webhook is configured.
 * It sends hub.mode, hub.verify_token and hub.challenge as query parameters.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("WhatsApp webhook verification failed: WHATSAPP_VERIFY_TOKEN is not configured");
    return new NextResponse("Webhook verify token is not configured", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("WhatsApp webhook verification rejected");
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Receives WhatsApp Cloud API webhook events.
 * Phase 2.9 initially acknowledges valid JSON events so Meta does not retry them.
 * Message/status persistence and business actions can be layered on this handler.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (payload?.object !== "whatsapp_business_account") {
      return NextResponse.json({ received: false }, { status: 400 });
    }

    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    const eventCount = entries.reduce((count: number, entry: any) => {
      const changes = Array.isArray(entry?.changes) ? entry.changes.length : 0;
      return count + changes;
    }, 0);

    console.info("WhatsApp webhook received", { eventCount });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Invalid WhatsApp webhook payload", error);
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
