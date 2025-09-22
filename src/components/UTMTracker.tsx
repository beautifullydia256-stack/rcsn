"use client";

import { useEffect } from "react";

// UTMTracker sends a click beacon to the API on first page load when utm params are present
export default function UTMTracker() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const utm_source = url.searchParams.get('utm_source');
      const utm_medium = url.searchParams.get('utm_medium');
      const utm_campaign = url.searchParams.get('utm_campaign');
      if (!utm_source && !utm_medium && !utm_campaign) return;

      fetch('/api/affiliate/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utm_source, utm_medium, utm_campaign, url: window.location.href })
      }).catch(() => {});
    } catch (_) {}
  }, []);

  return null;
}


