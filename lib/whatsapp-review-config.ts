/** Only booleans leave the server; never include secrets, IDs, or numbers. */
const blockedSenders = new Set(["1209018948971017", "1349830611552211", "1318642631325485"]);
export function getWhatsAppReviewConfigStatus(config: {
  enabled?: string; phoneId?: string; token?: string; recipient?: string;
}) {
  return {
    enabled: config.enabled === "true",
    senderIdValid: typeof config.phoneId === "string" && /^[0-9]+$/.test(config.phoneId) && !blockedSenders.has(config.phoneId),
    recipientValid: typeof config.recipient === "string" && /^[0-9]{7,15}$/.test(config.recipient),
    accessTokenPresent: typeof config.token === "string" && config.token.trim().length > 0,
  };
}
export function isValidWhatsAppReviewTestConfiguration(config: {
  phoneId?: string; token?: string; recipient?: string;
}) {
  const status = getWhatsAppReviewConfigStatus(config);
  return status.senderIdValid && status.recipientValid && status.accessTokenPresent;
}
