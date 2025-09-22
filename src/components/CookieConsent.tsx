"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type ConsentStatus = "accepted" | "declined" | null;

const STORAGE_KEY = "pwezacore_cookie_consent";

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentStatus>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Read choice after hydration
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (stored === "accepted" || stored === "declined") {
        setConsent(stored);
        if (stored === "accepted") {
          initializeTracking();
        }
      }
    } catch (_) {
      // Ignore storage errors (private mode, etc.)
    } finally {
      setHydrated(true);
    }
  }, []);

  function saveConsent(value: ConsentStatus) {
    try {
      if (value) window.localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {
      // Ignore storage errors
    }
    setConsent(value);
    if (value === "accepted") {
      initializeTracking();
      // Broadcast to the app so pages can conditionally load scripts
      window.dispatchEvent(new CustomEvent("pwezacore:consent", { detail: { consent: value } }));
    } else if (value === "declined") {
      // Broadcast decline so listeners can disable/avoid loading scripts
      window.dispatchEvent(new CustomEvent("pwezacore:consent", { detail: { consent: value } }));
      // Implement any cleanup if needed (e.g., clear analytics cookies)
    }
  }

  function initializeTracking() {
    // Placeholder: initialize analytics/ads only after consent
    // Example (Google Analytics gtag):
    // if (!window.dataLayer) {
    //   window.dataLayer = window.dataLayer || [];
    //   function gtag(){window.dataLayer.push(arguments as any);} (window as any).gtag = gtag;
    //   gtag('js', new Date());
    //   gtag('config', 'G-XXXXXXXXXX');
    // }
    // For AdSense or CMP, integrate initialization here or via a listener elsewhere.
  }

  // Do not render on server or before hydration state is known
  if (!hydrated) return null;
  if (consent === "accepted" || consent === "declined") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
        <div className="rounded-xl bg-slate-900/95 text-slate-100 shadow-2xl border border-white/10 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm leading-6 text-slate-200">
              We use cookies to improve your experience, analyze usage, and provide personalized content. See our {" "}
              <Link href="/cookie-policy" className="underline hover:text-white">Cookie Policy</Link>.
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => saveConsent("declined")}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 transition"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => saveConsent("accepted")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


