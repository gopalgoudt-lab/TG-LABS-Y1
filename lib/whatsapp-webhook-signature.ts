import { createHmac, timingSafeEqual } from "node:crypto";

/** Verify the exact raw UTF-8 payload supplied by Meta. */
export function isAuthenticMetaWebhook(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!appSecret || !signatureHeader || !/^sha256=[a-f0-9]{64}$/i.test(signatureHeader)) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  const received = Buffer.from(signatureHeader.slice(7), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
