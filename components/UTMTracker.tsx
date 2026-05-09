import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** Tracks UTM params via Supabase Edge Function (no Next.js API). */
export default function UTMTracker() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const utm_source = url.searchParams.get('utm_source');
      const utm_medium = url.searchParams.get('utm_medium');
      const utm_campaign = url.searchParams.get('utm_campaign');
      if (!utm_source && !utm_medium && !utm_campaign) return;

      supabase.functions
        .invoke('track-affiliate-click', {
          body: { utm_source, utm_medium, utm_campaign, url: window.location.href },
        })
        .catch(() => {});
    } catch (_) {}
  }, []);

  return null;
}


