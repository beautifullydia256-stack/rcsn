'use client';

import React from 'react';

export default function RecruitmentPrivacyNoticePage() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Notice for Recruitment</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="prose prose-slate max-w-none">
          <p>
            At PwezaCore, we are committed to protecting the privacy of all job applicants. This notice explains how we
            collect, use, and store your personal data during the recruitment process.
          </p>

          <h3>Information We Collect</h3>
          <p>
            We may collect your name, contact details, CV/resume, education and work history, references, interview
            notes, and any other information you provide to us.
          </p>

          <h3>How We Use Your Data</h3>
          <p>
            We use this information to assess your suitability for a role at PwezaCore, communicate with you, comply
            with legal requirements, and keep records of our hiring decisions.
          </p>

          <h3>Legal Basis</h3>
          <p>
            Our lawful bases for processing your information include legitimate interests in recruiting staff, your
            consent (when applicable), and compliance with legal obligations.
          </p>

          <h3>Data Retention</h3>
          <p>
            We keep recruitment data for up to 12 months, after which it is securely deleted unless we are legally
            required to keep it longer.
          </p>

          <h3>Sharing of Data</h3>
          <p>
            Your information will only be shared with hiring managers, HR staff, and service providers directly
            involved in the recruitment process. We do not sell or trade applicant data.
          </p>

          <h3>Your Rights</h3>
          <p>
            You have the right to access, correct, or request deletion of your data. You may also withdraw consent at
            any time.
          </p>

          <h3>Contact Us</h3>
          <p>
            If you have any questions about this notice, please contact us at <a className="text-blue-600" href="mailto:hr@pwezacore.com">hr@pwezacore.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}


