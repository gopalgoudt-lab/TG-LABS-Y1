/**
 * Fail-closed origin allowlist for the restricted Meta App Review Preview tool.
 * Vercel's deployment and branch URLs are server-provided hostnames, not user input.
 */
export function isAllowedWhatsAppReviewOrigin(
  origin: string | null,
  env: {
    VERCEL_ENV?: string;
    VERCEL_URL?: string;
    VERCEL_BRANCH_URL?: string;
    WHATSAPP_REVIEW_TEST_ORIGIN?: string;
  },
): boolean {
  if (env.VERCEL_ENV !== "preview" || !origin) return false;
  let parsed: URL;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.protocol !== "https:" || parsed.origin !== origin || parsed.username || parsed.password) return false;
  const configured = env.WHATSAPP_REVIEW_TEST_ORIGIN;
  const allowed = [configured, env.VERCEL_URL, env.VERCEL_BRANCH_URL]
    .filter((value): value is string => Boolean(value))
    .map(value => {
      try {
        const candidate = new URL(value.startsWith("https://") ? value : `https://${value}`);
        return candidate.protocol === "https:" && !candidate.username && !candidate.password &&
          candidate.pathname === "/" && !candidate.search && !candidate.hash
          ? candidate.origin : null;
      } catch { return null; }
    });
  return allowed.includes(parsed.origin);
}
