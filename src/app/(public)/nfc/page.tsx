"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CapturePayload {
  name: string;
  phone: string;
  bdRepId: string;
  hqOrgId: string;
  gpsLat?: number;
  gpsLng?: number;
}

async function submitLead(payload: CapturePayload): Promise<{ leadId: string; assignedOutlet: string }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const res = await fetch(`${base}/api/franchise/nfc/lead-capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Inner form (needs useSearchParams) ──────────────────────────────────────

function NfcForm() {
  const searchParams = useSearchParams();
  const bdRepId = searchParams.get("rep") ?? "";
  const hqOrgId = searchParams.get("org") ?? (process.env.NEXT_PUBLIC_COOLCATCH_ORG_ID ?? "");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Please fill in your name and phone number.");
      return;
    }
    if (!consent) {
      setError("Please accept the consent checkbox to continue.");
      return;
    }
    if (!hqOrgId) {
      setError("Invalid QR code — missing organisation reference. Please ask the CoolCatch rep for a new card.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: CapturePayload = {
      name: name.trim(),
      phone: phone.trim(),
      bdRepId: bdRepId.trim(),
      hqOrgId,
    };

    // Optionally grab GPS coordinates
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
        );
        payload.gpsLat = pos.coords.latitude;
        payload.gpsLng = pos.coords.longitude;
      } catch {
        // GPS is optional — no error
      }
    }

    try {
      await submitLead(payload);
      setDone(true);
    } catch (err) {
      setError((err as Error).message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-green-600" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re on the list!</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          A CoolCatch team member will follow up with you shortly about fresh fish delivery to your area.
        </p>
        <p className="mt-4 text-xs text-gray-400">You can close this page.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Your name *
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Mwangi"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone number *
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07XX XXX XXX"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-start gap-3">
        <input
          id="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
        />
        <label htmlFor="consent" className="text-xs text-gray-500 leading-relaxed">
          I agree to be contacted by CoolCatch Seafood about fresh fish delivery services.
          My information will be handled according to CoolCatch&apos;s privacy policy.
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting…" : "Get Fresh Fish Delivered →"}
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NfcLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-600 rounded-2xl mb-4 shadow-lg">
            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CoolCatch Seafood</h1>
          <p className="text-gray-500 text-sm mt-1">Fresh fish, delivered to your doorstep</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Get connected with us</h2>
          <p className="text-sm text-gray-500 mb-6">
            Leave your details and your nearest CoolCatch outlet will follow up with you shortly.
          </p>

          <Suspense fallback={
            <div className="space-y-4 animate-pulse">
              <div className="h-12 bg-gray-100 rounded-xl" />
              <div className="h-12 bg-gray-100 rounded-xl" />
              <div className="h-12 bg-sky-100 rounded-xl" />
            </div>
          }>
            <NfcForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by OdaFlow ERP · CoolCatch Seafood Ltd
        </p>
      </div>
    </div>
  );
}
