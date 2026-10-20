import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedWhatsAppReviewOrigin as allowed } from "../lib/whatsapp-review-origin";

const env = {
  VERCEL_ENV: "preview",
  VERCEL_URL: "tg-labs-y1-ajf3jqypd-gopalgoudt-7623s-projects.vercel.app",
  VERCEL_BRANCH_URL: "tg-labs-y1-git-fix-whatsapp-we-f4e013-gopalgoudt-7623s-projects.vercel.app",
  WHATSAPP_REVIEW_TEST_ORIGIN: "https://preview.example.org",
};
test("allows exact deployment, stable branch and configured origins", () => {
  assert.equal(allowed("https://" + env.VERCEL_URL, env), true);
  assert.equal(allowed("https://" + env.VERCEL_BRANCH_URL, env), true);
  assert.equal(allowed(env.WHATSAPP_REVIEW_TEST_ORIGIN, env), true);
});
test("rejects unrelated hosts, lookalikes, malformed and non-HTTPS origins", () => {
  for (const origin of [
    "https://evil.vercel.app",
    "https://" + env.VERCEL_URL + ".attacker.com",
    "http://" + env.VERCEL_URL,
    "https://" + env.VERCEL_URL + ":444",
    "https://" + env.VERCEL_URL + "/path",
    "null", "", "https://user@" + env.VERCEL_URL,
  ]) assert.equal(allowed(origin, env), false, origin);
});
test("disabled outside Vercel Preview and when origin missing", () => {
  assert.equal(allowed("https://" + env.VERCEL_URL, {...env, VERCEL_ENV: "production"}), false);
  assert.equal(allowed("https://" + env.VERCEL_URL, {...env, VERCEL_ENV: undefined}), false);
  assert.equal(allowed(null, env), false);
});
