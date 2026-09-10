import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WhatsAppStatus = {
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{
    code?: number;
    title?: string;
    message?: string;
    error_data?: {
      details?: string;
    };
  }>;
};

function logDeliveryStatuses(payload: any) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const statuses: WhatsAppStatus[] = Array.isArray(change?.value?.statuses)
        ? change.value.statuses
        : [];

      for (const status of statuses) {
        const normalizedStatus = typeof status?.status === "string" ? status.status : "unknown";
        const errors = Array.isArray(status?.errors) ? status.errors : [];
        const safeErrors = errors.map((error) => ({
          code: error?.code,
          title: error?.title,
        }));

        if (normalizedStatus === "failed") {
          console.error("WhatsApp delivery status failed", {
            status: normalizedStatus,
            errorCount: safeErrors.length,
            errors: safeErrors,
          });
        } else {
          console.info("WhatsApp delivery status received", {
            status: normalizedStatus,
            errorCount: safeErrors.length,
          });
        }
      }
    }
  }
}

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
 * Delivery status observability is intentionally log-only: it does not persist
 * message IDs, recipient phone numbers, booking data, or webhook payloads.
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
    logDeliveryStatuses(payload);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Invalid WhatsApp webhook payload", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
