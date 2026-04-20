'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsOfUsePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="mb-6">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Home
          </Link>
        </p>
        <h1 className="text-3xl font-bold mb-6">Terms of Use</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Last updated: April 2026</p>
        <section className="space-y-4 text-gray-700 dark:text-gray-300">
          <p>
            These Terms of Use govern your access to and use of PwezaCore. By using the service, you agree to these
            terms and our{' '}
            <Link href="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
          <p>
            Schools and organizations using PwezaCore are responsible for their own data, user accounts, and compliance
            with applicable law. For commercial terms, billing, or enterprise agreements, reach out via the channel your
            school was given at onboarding.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            A full legal agreement may be provided separately for your institution. This page is a summary for visitors
            to the public site.
          </p>
        </section>
      </div>
    </main>
  );
}
