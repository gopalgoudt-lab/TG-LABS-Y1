import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/api/whatsapp/webhook/route";

function webhookRequest(payload: unknown) {
  return new NextRequest("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

test("logs failed WhatsApp delivery status without recipient or message identifiers", async () => {
  const errorLogs: unknown[][] = [];
  const infoLogs: unknown[][] = [];
  const originalError = console.error;
  const originalInfo = console.info;

  console.error = (...args: unknown[]) => errorLogs.push(args);
  console.info = (...args: unknown[]) => infoLogs.push(args);

  try {
    const response = await POST(webhookRequest({
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            statuses: [{
              id: "wamid.secret-message-id",
              recipient_id: "919999999999",
              status: "failed",
              timestamp: "1789020000",
              errors: [{
                code: 131026,
                title: "Message undeliverable",
                message: "Sensitive provider detail",
                error_data: { details: "Sensitive downstream detail" },
              }],
            }],
          },
        }],
      }],
    }));

    assert.equal(response.status, 200);

    const serialized = JSON.stringify({ errorLogs, infoLogs });
    assert.match(serialized, /WhatsApp delivery status failed/);
    assert.match(serialized, /131026/);
    assert.match(serialized, /Message undeliverable/);
    assert.doesNotMatch(serialized, /wamid\.secret-message-id/);
    assert.doesNotMatch(serialized, /919999999999/);
    assert.doesNotMatch(serialized, /Sensitive provider detail/);
    assert.doesNotMatch(serialized, /Sensitive downstream detail/);
  } finally {
    console.error = originalError;
    console.info = originalInfo;
  }
});

test("logs non-failed delivery statuses with only status and error count", async () => {
  const infoLogs: unknown[][] = [];
  const originalInfo = console.info;

  console.info = (...args: unknown[]) => infoLogs.push(args);

  try {
    const response = await POST(webhookRequest({
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            statuses: [{
              id: "wamid.hidden",
              recipient_id: "918888888888",
              status: "delivered",
            }],
          },
        }],
      }],
    }));

    assert.equal(response.status, 200);

    const serialized = JSON.stringify(infoLogs);
    assert.match(serialized, /WhatsApp delivery status received/);
    assert.match(serialized, /delivered/);
    assert.doesNotMatch(serialized, /wamid\.hidden/);
    assert.doesNotMatch(serialized, /918888888888/);
  } finally {
    console.info = originalInfo;
  }
});
