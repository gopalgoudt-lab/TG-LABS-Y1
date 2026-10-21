import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "WhatsApp coexistence readiness | TG LABS Admin",
  robots: { index: false, follow: false },
};

const checks = [
  "Confirm Meta eligibility for WhatsApp Business App coexistence.",
  "Resolve the duplicate unverified number entries with Meta support.",
  "Verify the production domain and allowed Facebook Login SDK origins.",
  "Implement short-lived, server-validated signup state and server-side code exchange.",
  "Verify existing WhatsApp Business app remains connected after an authorized test.",
  "Verify META_APP_SECRET and signed webhook delivery before deployment.",
];

export default function WhatsAppCoexistenceReadinessPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 840, margin: "0 auto" }}>
      <h1>WhatsApp Business App coexistence</h1>
      <p><strong>Not connected — setup locked</strong></p>
      <p>
        The existing TG LABS Meta Embedded Signup configuration has been reviewed.
        Connecting the existing WhatsApp Business mobile-app number is blocked
        until Meta eligibility and the secure authorization flow are verified.
      </p>
      <dl>
        <dt>Meta app</dt><dd>904595392273250</dd>
        <dt>Embedded Signup configuration</dt><dd>1779042243370993</dd>
        <dt>Target number</dt><dd>+91 96526 03022</dd>
      </dl>
      <h2>Required before activation</h2>
      <ol>{checks.map((item) => <li key={item}>{item}</li>)}</ol>
      <button type="button" disabled aria-disabled="true" title="Blocked until coexistence eligibility and secure server-side integration are verified">
        Connect WhatsApp Business App (not available yet)
      </button>
      <p>
        This page does not open Meta Signup, request a token, register a number,
        or change the existing WhatsApp Business app.
      </p>
      <p><Link href="/admin/whatsapp-review-test">Open restricted Meta App Review test-message page</Link></p>
      <Link href="/admin">Return to admin</Link>
    </main>
  );
}
