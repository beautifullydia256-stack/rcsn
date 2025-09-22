'use client';

import React from 'react';
import Link from 'next/link';

export default function SecurityLetterPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Security Statement</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        {/* Introduction */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Our Commitment to Safety and Trust</h2>
          <p>
            PwezaCore is a multi-tenant school management platform used by schools, teachers, parents, and students. We
            understand that the information you share with us is sensitive—covering student records, attendance, grades,
            communications, and financial data. Protecting that data is core to our mission. Security is not a feature
            we add later—it is built into our architecture, processes, and culture from day one.
          </p>
        </section>

        {/* Data Protection */}
        <section className="space-y-4 mt-10">
          <h2 className="text-xl font-semibold">Data Protection by Design</h2>
          <p>
            We implement multiple layers of protection to safeguard data throughout its lifecycle—from the moment it is
            created to when it is stored and accessed.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <span className="font-medium">Encryption in transit:</span> All traffic between clients and our servers is
              protected with TLS/HTTPS to prevent interception and tampering.
            </li>
            <li>
              <span className="font-medium">Encryption at rest:</span> Databases and backups are stored on encrypted
              volumes using industry-standard encryption.
            </li>
            <li>
              <span className="font-medium">Access controls:</span> Role-Based Access Control (RBAC) and Row-Level Security (RLS)
              ensure users only see data they are authorized to access. Each school’s data is logically isolated in our
              multi-tenant architecture.
            </li>
            <li>
              <span className="font-medium">Authentication:</span> We use secure authentication with session protection. Administrative
              actions are restricted to privileged roles. We recommend strong, unique passwords and multi-factor
              authentication (MFA) where available.
            </li>
            <li>
              <span className="font-medium">Least privilege:</span> Internal access to production systems follows the principle of least
              privilege and is granted on an as-needed basis with periodic reviews.
            </li>
          </ul>
        </section>

        {/* Infrastructure */}
        <section className="space-y-4 mt-10">
          <h2 className="text-xl font-semibold">Secure Infrastructure</h2>
          <p>
            PwezaCore is built on a modern cloud stack (including managed infrastructure such as hosting, databases, and
            storage). Our providers maintain robust physical and network security controls including firewalls, DDoS
            protection, and continuous monitoring.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <span className="font-medium">Backups & recovery:</span> Data backups are performed regularly and stored securely to
              support disaster recovery.
            </li>
            <li>
              <span className="font-medium">Monitoring:</span> Application and infrastructure telemetry is monitored for performance and
              anomalous behavior.
            </li>
            <li>
              <span className="font-medium">Network security:</span> Firewalls, private networking, and least-exposed services reduce the
              attack surface.
            </li>
            <li>
              <span className="font-medium">Compliance posture:</span> Our providers offer industry certifications such as SOC 2 and ISO/IEC
              27001 for core infrastructure. PwezaCore aligns its practices with GDPR and other relevant data protection
              frameworks.
            </li>
          </ul>
        </section>

        {/* Monitoring & Incident Response */}
        <section className="space-y-4 mt-10">
          <h2 className="text-xl font-semibold">Monitoring and Incident Response</h2>
          <p>
            We proactively monitor for suspicious activity and service degradation. If we detect a security incident,
            our team follows a documented incident response plan: identification, containment, investigation, remediation,
            and post-incident review.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Rapid triage and containment to limit impact and restore normal operations.</li>
            <li>Forensic investigation to determine root cause and affected systems/data.</li>
            <li>Remediation steps and hardening to prevent recurrence.</li>
            <li>
              Notification to affected customers and relevant authorities when required by applicable laws and contracts.
            </li>
          </ul>
        </section>

        {/* Compliance */}
        <section className="space-y-4 mt-10">
          <h2 className="text-xl font-semibold">Compliance and Privacy Alignment</h2>
          <p>
            PwezaCore aligns with data protection principles under the EU General Data Protection Regulation (GDPR), the
            UK Data Protection Act, and Swiss privacy laws where applicable. Our processing is grounded in appropriate
            legal bases such as contract performance, legitimate interests, consent (where required), and legal
            obligations.
          </p>
          <p>
            For more information on how we collect and use data, please see our{' '}
            <Link href="/privacy-policy" className="text-blue-600">Privacy Policy</Link> and{' '}
            <Link href="/cookie-policy" className="text-blue-600">Cookie Policy</Link>.
          </p>
        </section>

        {/* User Responsibility */}
        <section className="space-y-4 mt-10">
          <h2 className="text-xl font-semibold">Shared Responsibility</h2>
          <p>
            Security is a partnership. We encourage all users to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use strong, unique passwords and enable MFA where available.</li>
            <li>Limit account sharing; assign proper roles to staff and keep access current.</li>
            <li>Be cautious of phishing attempts and suspicious links or attachments.</li>
            <li>Promptly report suspected security issues to our team.</li>
          </ul>
        </section>

        {/* Contact */}
        <section className="space-y-4 mt-10">
          <h2 className="text-xl font-semibold">Contact Our Security Team</h2>
          <p>
            If you have questions about PwezaCore’s security practices or wish to report a potential vulnerability,
            please contact us at{' '}
            <a className="text-blue-600" href="mailto:security@pwezacore.com">security@pwezacore.com</a>.
          </p>
          <p>
            We review reports promptly and appreciate responsible disclosure. Your trust is essential, and we’re
            committed to maintaining the confidentiality, integrity, and availability of your data.
          </p>
        </section>
      </div>
    </main>
  );
}


