import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src={publicAssetUrl('logo.png')} alt="PwezaCore" width={28} height={28} className="rounded" />
              <h1 className="text-2xl font-bold text-blue-600">PwezaCore</h1>
            </Link>
            <Link
              to="/"
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 lg:p-12"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Last updated: April 30, 2026
            </p>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                PwezaCore ("we," "our," or "us") is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our school management system and related services.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                By using PwezaCore, you agree to the collection and use of information in accordance with this policy. We will not use or share your information with anyone except as described in this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">2.1 Personal Information</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Student information (names, dates of birth, contact details, academic records)</li>
                <li>Parent/guardian information (names, contact details, relationship to student)</li>
                <li>Staff information (names, contact details, employment records)</li>
                <li>School administrative data (fees, attendance, grades, disciplinary records)</li>
                <li>Account credentials and login information</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Usage data and system logs</li>
                <li>Device information and IP addresses</li>
                <li>Browser type and operating system</li>
                <li>Access times and referring websites</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Providing and maintaining our school management services</li>
                <li>Managing student records, grades, and academic progress</li>
                <li>Facilitating communication between schools, parents, and students</li>
                <li>Processing fee payments and generating financial reports</li>
                <li>Generating academic reports and certificates</li>
                <li>Ensuring system security and preventing unauthorized access</li>
                <li>Improving our services and developing new features</li>
                <li>Complying with legal obligations and regulatory requirements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li><strong>With your consent:</strong> When you explicitly authorize us to share your information</li>
                <li><strong>Service providers:</strong> With trusted third-party service providers who assist in operating our platform</li>
                <li><strong>Legal compliance:</strong> When required by law, court order, or government regulation</li>
                <li><strong>Safety and security:</strong> To protect the rights, property, or safety of PwezaCore, our users, or others</li>
                <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Security</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We implement robust security measures to protect your personal information:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>End-to-end encryption for data transmission</li>
                <li>Secure cloud storage with regular backups</li>
                <li>Multi-factor authentication for administrative accounts</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Strict access controls and employee training</li>
                <li>Compliance with international data protection standards</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Your Rights and Choices</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li><strong>Access:</strong> Request access to your personal information we hold</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
                <li><strong>Portability:</strong> Request a copy of your data in a structured, machine-readable format</li>
                <li><strong>Restriction:</strong> Request restriction of processing under certain circumstances</li>
                <li><strong>Objection:</strong> Object to processing of your personal information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Data Retention</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We retain your personal information for as long as necessary to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Provide our services to you</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Meet regulatory requirements for educational records</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Student academic records are typically retained for a minimum of 7 years after graduation or withdrawal, in accordance with educational regulations in Uganda.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Children's Privacy</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                PwezaCore is designed for use by educational institutions to manage student information. We collect and process information about students of all ages as part of our educational services. We take special care to protect the privacy of children under 18 and comply with applicable laws regarding children's privacy.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Parents and guardians have the right to review, correct, or request deletion of their child's personal information, subject to educational record-keeping requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. International Data Transfers</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Your information may be transferred to and processed in countries other than Uganda. We ensure that such transfers are conducted in accordance with applicable data protection laws and that appropriate safeguards are in place to protect your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes by:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Posting the new Privacy Policy on this page</li>
                <li>Updating the "Last updated" date</li>
                <li>Sending you an email notification for significant changes</li>
                <li>Displaying a prominent notice on our platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
                <p className="text-gray-600 dark:text-gray-300 mb-2"><strong>Email:</strong> privacy@pwezacore.com</p>
                <p className="text-gray-600 dark:text-gray-300 mb-2"><strong>Phone:</strong> +256 394 529 753</p>
                <p className="text-gray-600 dark:text-gray-300 mb-2"><strong>WhatsApp:</strong> +256 742 490 303</p>
                <p className="text-gray-600 dark:text-gray-300"><strong>Address:</strong> Kampala, Uganda</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Governing Law</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                This Privacy Policy is governed by and construed in accordance with the laws of Uganda. Any disputes arising from this policy will be subject to the exclusive jurisdiction of the courts of Uganda.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This Privacy Policy is effective as of April 30, 2026
            </p>
            <Link
              to="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
