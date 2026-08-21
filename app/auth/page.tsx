"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "../../lib/firebase";

export default function AuthPage() {
  const router = useRouter();
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function resetRecaptcha() {
    try {
      verifier.current?.clear();
    } catch {
      // Ignore Firebase cleanup errors and recreate the verifier below.
    }
    verifier.current = null;

    const container = document.getElementById("recaptcha-container");
    if (container) container.innerHTML = "";
  }

  useEffect(() => {
    return () => resetRecaptcha();
  }, []);

  function normalizedPhone() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    if (phone.trim().startsWith("+")) return phone.trim();
    throw new Error("Enter a valid 10-digit Indian mobile number.");
  }

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      resetRecaptcha();
      const auth = getFirebaseAuth();

      verifier.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });

      await verifier.current.render();

      const result = await signInWithPhoneNumber(auth, normalizedPhone(), verifier.current);
      setConfirmation(result);
      setMessage("OTP sent successfully. Enter the 6-digit code received by SMS.");
    } catch (error) {
      resetRecaptcha();
      setMessage(error instanceof Error ? error.message : "Unable to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!confirmation) return;
    setLoading(true);
    setMessage("");

    try {
      await confirmation.confirm(otp.trim());
      resetRecaptcha();
      setMessage("Mobile number verified. Opening your patient account…");
      router.push("/patient");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid OTP. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  }

  function changeNumber() {
    resetRecaptcha();
    setConfirmation(null);
    setOtp("");
    setMessage("");
  }

  return (
    <main className="wrap" style={{ padding: "72px 0", maxWidth: 560 }}>
      <div className="card" style={{ padding: 28 }}>
        <p style={{ margin: 0, fontWeight: 700, color: "#087f6b" }}>TG LABS SECURE LOGIN</p>
        <h1 style={{ marginBottom: 8 }}>Sign in with mobile OTP</h1>
        <p style={{ marginTop: 0 }}>Use your mobile number to securely access bookings, reports and your patient account.</p>

        {!confirmation ? (
          <form onSubmit={sendOtp}>
            <label htmlFor="phone" style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Mobile number</label>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="btn" style={{ cursor: "default" }}>+91</span>
              <input
                id="phone"
                inputMode="tel"
                autoComplete="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                required
                style={{ flex: 1, padding: 12, border: "1px solid #cbd5e1", borderRadius: 10 }}
              />
            </div>
            <button className="btn primary" type="submit" disabled={loading || phone.length !== 10} style={{ marginTop: 18 }}>
              {loading ? "Sending OTP…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <label htmlFor="otp" style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>6-digit OTP</label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter OTP"
              required
              style={{ width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, letterSpacing: 5, fontSize: 20 }}
            />
            <button className="btn primary" type="submit" disabled={loading || otp.length !== 6} style={{ marginTop: 18 }}>
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button className="btn" type="button" disabled={loading} onClick={changeNumber} style={{ marginTop: 18, marginLeft: 8 }}>
              Change number
            </button>
          </form>
        )}

        <div id="recaptcha-container" />
        {message && <p role="status" style={{ marginTop: 18 }}>{message}</p>}
        <p style={{ marginTop: 24, fontSize: 13 }}>By continuing, you agree to TG Labs' Terms and Privacy Policy. Standard SMS charges may apply.</p>
      </div>
    </main>
  );
}
