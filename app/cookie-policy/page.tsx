'use client';

import React from 'react';
import Link from 'next/link';

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Cookie Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-4">
          <p>
            This Cookie Policy explains what cookies are, how PwezaCore ("we", "us") uses them, and how you can
            manage your cookie preferences when using our platform.
          </p>

          <h2 className="text-xl font-semibold mt-8">1. What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device. They help websites function, remember preferences, and
            understand how users interact with the site.
          </p>

          <h2 className="text-xl font-semibold mt-8">2. Types of Cookies We Use</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><span className="font-medium">Strictly Necessary</span>: Required for core functionality (e.g., login sessions).</li>
            <li><span className="font-medium">Preferences</span>: Remember settings such as theme and language.</li>
            <li><span className="font-medium">Analytics</span>: Help us understand usage and improve the Service (e.g., Google Analytics).</li>
            <li><span className="font-medium">Marketing</span>: Measure ad performance (if enabled) and personalize content.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">3. Why We Use Cookies</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Maintain secure sessions and account access.</li>
            <li>Remember preferences to improve experience.</li>
            <li>Measure performance and troubleshoot issues.</li>
            <li>Support optional features like ads or social sharing.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">4. Managing Cookies</h2>
          <p>
            You can manage or disable cookies via your browser settings. Note that disabling certain cookies may impair
            functionality (e.g., login). You can also opt-out of analytics via tools provided by analytics vendors.
          </p>

          <h2 className="text-xl font-semibold mt-8">5. Third-Party Cookies</h2>
          <p>
            Some third-party services may set cookies (e.g., Google Analytics, AdSense). Their use is governed by their
            respective privacy and cookie policies.
          </p>

          <h2 className="text-xl font-semibold mt-8">6. More Information</h2>
          <p>
            For more details on how we handle personal data, please see our{' '}
            <Link href="/privacy-policy" className="text-blue-600">Privacy Policy</Link>.
          </p>

          <h2 className="text-xl font-semibold mt-8">7. Contact</h2>
          <p>
            Questions about this policy? Contact <a className="text-blue-600" href="mailto:support@pwezacore.com">support@pwezacore.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}


