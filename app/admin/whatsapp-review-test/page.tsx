"use client";
import Link from "next/link";
import { useState } from "react";

export default function WhatsAppReviewTestPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  async function sendTest() {
    if (!confirmed || busy) return;
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
    <button type="button" disabled={!confirmed || busy} onClick={sendTest} style={{ padding: "12px 18px", borderRadius: 8, cursor: confirmed ? "pointer" : "not-allowed" }}>
      {busy ? "Sending test request…" : "Send Meta test message"}
    </button>
    {result && <p role="status" aria-live="polite">{result}</p>}
    <p style={{ marginTop: 24 }}>A successful API response is not proof of delivery. Confirm the message arrives on the test device before recording App Review evidence.</p>
    <Link href="/admin/whatsapp-coexistence">Return to WhatsApp readiness</Link>
  </main>;
}
