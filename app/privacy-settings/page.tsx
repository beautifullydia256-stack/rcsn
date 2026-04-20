'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacySettingsPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="mb-6">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Home
          </Link>
        </p>
        <h1 className="text-3xl font-bold mb-6">Privacy settings</h1>
        <section className="space-y-4 text-gray-700 dark:text-gray-300">
          <p>
            <span className="font-medium">Cookies and similar technologies.</span> See our{' '}
            <Link href="/cookie-policy" className="text-blue-600 dark:text-blue-400 hover:underline">
              Cookie Policy
            </Link>{' '}
            for what we use and why. When you first visit, you can accept or decline non-essential cookies via the
            banner at the bottom of the page.
          </p>
          <p>
            <span className="font-medium">Changing your choice.</span> To reset the cookie banner choice, clear site
            data for this domain in your browser settings, then reload the site. Essential cookies required for login
            and security may still be set.
          </p>
          <p>
            <span className="font-medium">Account data.</span> For access, correction, or deletion requests relating to
            personal data we process as a service provider to your school, contact your school administrator. For how we
            process data, read our{' '}
            <Link href="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
