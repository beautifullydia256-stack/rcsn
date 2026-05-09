import React from "react";

/** Plain anchors work for both Next.js and Vite SPAs. */
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm">
        <p className="text-gray-200 mb-3">Copyright © 2026 PwezaCore.</p>
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm font-medium tracking-wide text-gray-400"
          aria-label="Legal"
        >
          <a href="/terms-of-use" className="hover:text-white transition-colors">
            TERMS OF USE
          </a>
          <span className="text-gray-600 select-none" aria-hidden>
            |
          </span>
          <a href="/privacy-policy" className="hover:text-white transition-colors">
            PRIVACY POLICY
          </a>
          <span className="text-gray-600 select-none" aria-hidden>
            |
          </span>
          <a href="/privacy-settings" className="hover:text-white transition-colors">
            PRIVACY SETTINGS
          </a>
        </nav>
      </div>
    </footer>
  );
}
