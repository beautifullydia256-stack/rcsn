'use client';

import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-4">
          <p>
            This Privacy Policy explains how PwezaCore ("we", "us", "our") collects, uses, discloses, and protects
            personal information when you use our multi-tenant school management platform (the "Service").
          </p>

          <h2 className="text-xl font-semibold mt-8">1. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account data: names, emails, passwords (hashed), phone numbers.</li>
            <li>School data: school name, location, type, admin details.</li>
            <li>Operational data: student, teacher, parent records; classes; attendance; grades; payments; reports.</li>
            <li>Technical data: device info, IP address, logs, cookies and analytics events.</li>
            <li>Support data: messages and communications with our support team.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">2. How We Use Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, operate, and improve the Service and its features.</li>
            <li>Authenticate users and enforce security, access control, and audit logs.</li>
            <li>Generate academic reports, process attendance, and manage payments/receipts.</li>
            <li>Communicate important updates, notifications, and support responses.</li>
            <li>Analyze usage to enhance performance, reliability, and user experience.</li>
            <li>Comply with legal obligations and enforce our Terms.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">3. Legal Bases</h2>
          <p>
            We process personal data under the following legal bases (as applicable): consent, contract performance,
            legitimate interests (e.g., security, user experience), and legal obligations. We align with the EU GDPR,
            UK Data Protection Act, and Swiss data protection principles where relevant.
          </p>

          <h2 className="text-xl font-semibold mt-8">4. Sharing and Third Parties</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Infrastructure and hosting (e.g., Supabase, Vercel).</li>
            <li>Analytics and monitoring (e.g., Google Analytics).</li>
            <li>Email and notifications (e.g., transactional email providers).</li>
            <li>Payments (e.g., payment processors where applicable).</li>
            <li>Professional advisors and legal authorities when required by law.</li>
          </ul>
          <p>We require service providers to implement appropriate security and confidentiality measures.</p>

          <h2 className="text-xl font-semibold mt-8">5. International Transfers</h2>
          <p>
            If personal data is transferred internationally, we implement safeguards (e.g., Standard Contractual
            Clauses) to protect your information.
          </p>

          <h2 className="text-xl font-semibold mt-8">6. Data Retention</h2>
          <p>
            We retain personal data only for as long as necessary to deliver the Service and meet legal requirements.
            Retention periods may vary depending on the data category and contractual needs.
          </p>

          <h2 className="text-xl font-semibold mt-8">7. Your Rights</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access, rectification, deletion, and portability of your personal data.</li>
            <li>Withdraw consent where processing is based on consent.</li>
            <li>Object to or restrict certain processing activities.</li>
            <li>Lodge a complaint with a relevant supervisory authority.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8">8. Security</h2>
          <p>
            We use appropriate technical and organizational measures to protect personal data, including role-based
            access, encryption in transit, audit logs, and secure development practices.
          </p>

          <h2 className="text-xl font-semibold mt-8">9. Children</h2>
          <p>
            PwezaCore is used by schools under appropriate authority. Where applicable, the school acts as data
            controller and ensures appropriate consent and notices for minors.
          </p>

          <h2 className="text-xl font-semibold mt-8">10. Contact Us</h2>
          <p>
            For privacy questions or requests, contact us at <a className="text-blue-600" href="mailto:support@pwezacore.com">support@pwezacore.com</a>.
          </p>

          <h2 className="text-xl font-semibold mt-8">11. Changes to this Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be communicated appropriately.
          </p>
        </section>
      </div>
    </main>
  );
}


