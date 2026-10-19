import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { isAuthenticMetaWebhook } from "../lib/whatsapp-webhook-signature";

const secret = "unit-test-only-secret";
const body = '{"object":"whatsapp_business_account","entry":[]}';
const signature = "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex");

test("accepts a correctly signed raw Meta payload", () => {
  assert.equal(isAuthenticMetaWebhook(body, signature, secret), true);
});

test("rejects missing signature, secret, and malformed signatures", () => {
  assert.equal(isAuthenticMetaWebhook(body, null, secret), false);
  assert.equal(isAuthenticMetaWebhook(body, signature, ""), false);
  assert.equal(isAuthenticMetaWebhook(body, "sha256=invalid", secret), false);
  assert.equal(isAuthenticMetaWebhook(body, "sha1=" + signature.slice(7), secret), false);
});

test("rejects tampered payloads, wrong secrets, and incorrect signatures", () => {
  assert.equal(isAuthenticMetaWebhook(body + " ", signature, secret), false);
  assert.equal(isAuthenticMetaWebhook(body, signature, "wrong-secret"), false);
  assert.equal(isAuthenticMetaWebhook(body, "sha256=" + "0".repeat(64), secret), false);
});

test("accepts upper-case hex signatures", () => {
  assert.equal(isAuthenticMetaWebhook(body, "sha256=" + signature.slice(7).toUpperCase(), secret), true);
});
