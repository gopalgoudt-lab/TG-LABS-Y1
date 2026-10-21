/**
 * Untrusted postMessage data from Meta's WhatsApp Embedded Signup.
 * Parsing is deliberately side-effect free: it never links a WABA, stores
 * credentials, or changes the currently configured sending number.
 */
export type EmbeddedSignupEvent = {
  type: "WA_EMBEDDED_SIGNUP";
  event: string;
  data: {
    waba_id?: string;
    phone_number_id?: string;
    [key: string]: unknown;
  };
};

export function parseMetaEmbeddedSignupEvent(
  origin: string,
  rawData: unknown,
): EmbeddedSignupEvent | null {
  // Only Meta's Facebook origin is accepted. Never trust event.data alone.
  if (origin !== "https://www.facebook.com") return null;

  let value: unknown = rawData;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.type !== "WA_EMBEDDED_SIGNUP" || typeof record.event !== "string") return null;
  if (!record.data || typeof record.data !== "object" || Array.isArray(record.data)) return null;

  const data = record.data as Record<string, unknown>;
  if (data.waba_id !== undefined && typeof data.waba_id !== "string") return null;
  if (data.phone_number_id !== undefined && typeof data.phone_number_id !== "string") return null;

  return {
    type: "WA_EMBEDDED_SIGNUP",
    event: record.event,
    data: data as EmbeddedSignupEvent["data"],
  };
}
