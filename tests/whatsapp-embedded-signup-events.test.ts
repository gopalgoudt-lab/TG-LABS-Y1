import assert from "node:assert/strict";
import test from "node:test";
import { parseMetaEmbeddedSignupEvent } from "../lib/whatsapp-embedded-signup-events";

const sample = {
  type: "WA_EMBEDDED_SIGNUP",
  event: "FINISH",
  data: { waba_id: "123", phone_number_id: "456" },
};

test("accepts well-formed Meta Embedded Signup message", () => {
  assert.deepEqual(parseMetaEmbeddedSignupEvent("https://www.facebook.com", sample), sample);
});

test("accepts Meta JSON-encoded message", () => {
  assert.deepEqual(parseMetaEmbeddedSignupEvent("https://www.facebook.com", JSON.stringify(sample)), sample);
});

test("rejects messages from non-Meta origins", () => {
  assert.equal(parseMetaEmbeddedSignupEvent("https://example.com", sample), null);
  assert.equal(parseMetaEmbeddedSignupEvent("https://www.facebook.com.evil.test", sample), null);
});

test("rejects malformed or unrelated messages", () => {
  assert.equal(parseMetaEmbeddedSignupEvent("https://www.facebook.com", "not-json"), null);
  assert.equal(parseMetaEmbeddedSignupEvent("https://www.facebook.com", { ...sample, type: "OTHER" }), null);
  assert.equal(parseMetaEmbeddedSignupEvent("https://www.facebook.com", { ...sample, data: null }), null);
  assert.equal(parseMetaEmbeddedSignupEvent("https://www.facebook.com", { ...sample, data: { waba_id: 123 } }), null);
});
