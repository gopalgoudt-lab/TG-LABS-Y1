"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function WhatsAppReviewTestPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean> | null>(null);
  const [checkError, setCheckError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/whatsapp-review-test", {
      method: "POST", credentials: "same-origin",
      headers: { "x-whatsapp-review-config-check": "status" },
      cache: "no-store",
    }).then(async response => {
      const data = await response.json();
      if (cancelled) return;
      if (response.ok && data.checks) setChecks(data.checks);
      else setCheckError(data.error || "Configuration status unavailable.");
    }).catch(() => { if (!cancelled) setCheckError("Configuration status unavailable."); });
    return () => { cancelled = true; };
  }, []);
  async function sendTest() {
    if (!confirmed || busy || !checks || !Object.values(checks).every(Boolean)) return;
    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/api/admin/whatsapp-review-test", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "SEND_REVIEW_TEST" }),
      });
      const data = await response.json();
      setResult(response.ok ? (data.detail || "Meta accepted the request.") : (data.error || "Test send blocked."));
    } catch {
      setResult("Test send could not be completed.");
    } finally {
      setBusy(false);
      setConfirmed(false);
    }
  }
  return <main style={{ maxWidth: 760, margin: "2rem auto", padding: "1.5rem", fontFamily: "Arial,sans-serif", lineHeight: 1.6 }}>
    <h1>WhatsApp App Review — test message</h1>
    <p><strong>Restricted Super Admin tool. Disabled unless explicitly configured in Preview.</strong></p>
    <p>This sends Meta's fixed <code>hello_world</code> template from a separately configured Meta test sender to one pre-approved test recipient. It does not use or connect the existing TG LABS WhatsApp Business mobile-app number.</p>
    <p>Only a signed-in, specifically authorized Super Admin can use the server endpoint. No phone number, access token, or custom message can be entered here.</p>
    <label style={{ display: "block", margin: "1.5rem 0" }}>
      <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{" "}
      I confirm this is an authorized test to a consenting test recipient, not a patient.
    </label>
    <button type="button" disabled={!confirmed || busy || !checks || !Object.values(checks).every(Boolean)} onClick={sendTest} style={{ padding: "12px 18px", borderRadius: 8, cursor: confirmed ? "pointer" : "not-allowed" }}>
      {busy ? "Sending test request…" : "Send Meta test message"}
    </button>
    <section aria-label="Preview configuration checks" style={{ marginTop: 16 }}>
      <strong>Preview configuration status (no secret values shown)</strong>
      {checks ? <ul>
        <li>Test enabled: {checks.enabled ? "Ready" : "Needs attention"}</li>
        <li>Meta test sender ID: {checks.senderIdValid ? "Valid format" : "Needs attention"}</li>
        <li>Test recipient: {checks.recipientValid ? "Valid format" : "Needs attention"}</li>
        <li>Access token: {checks.accessTokenPresent ? "Present" : "Missing"}</li>
      </ul> : <p role="status">{checkError || "Checking configuration…"}</p>}
    </section>
    {result && <p role="status" aria-live="polite">{result}</p>}
    <p style={{ marginTop: 24 }}>A successful API response is not proof of delivery. Confirm the message arrives on the test device before recording App Review evidence.</p>
    <Link href="/admin/whatsapp-coexistence">Return to WhatsApp readiness</Link>
  </main>;
}
