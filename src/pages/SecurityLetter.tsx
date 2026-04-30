import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

export default function SecurityLetterPage() {
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
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Security Statement</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Your data security is our top priority
            </p>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Our Commitment to Security</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                At PwezaCore, we understand that schools entrust us with their most sensitive data - student records, financial information, and personal details. We take this responsibility seriously and have implemented comprehensive security measures to protect your information at every level.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                This security statement outlines the technical, administrative, and physical safeguards we have in place to ensure your data remains secure, confidential, and available when you need it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data Encryption & Protection</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Encryption in Transit</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>All data transmitted between your device and our servers is encrypted using TLS 1.3</li>
                <li>HTTPS encryption for all web communications</li>
                <li>Secure API endpoints with certificate pinning</li>
                <li>End-to-end encryption for sensitive communications</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Encryption at Rest</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>AES-256 encryption for all stored data</li>
                <li>Encrypted database storage with rotating keys</li>
                <li>Secure file storage with client-side encryption</li>
                <li>Encrypted backups with geographically distributed storage</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Access Control & Authentication</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Multi-Factor Authentication</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We require multi-factor authentication (MFA) for all administrative accounts and strongly recommend it for all users. This adds an extra layer of security beyond just passwords.
              </p>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Role-Based Access Control</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Granular permissions based on user roles (admin, teacher, parent, student)</li>
                <li>Principle of least privilege - users only access what they need</li>
                <li>Regular access reviews and automated deprovisioning</li>
                <li>Audit trails for all access and data modifications</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Session Management</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Secure session tokens with automatic expiration</li>
                <li>Session invalidation on suspicious activity</li>
                <li>Device tracking and management</li>
                <li>Automatic logout after inactivity</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Infrastructure Security</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Cloud Security</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                PwezaCore is hosted on enterprise-grade cloud infrastructure with:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>SOC 2 Type II certified data centers</li>
                <li>ISO 27001 compliance</li>
                <li>24/7 physical security and monitoring</li>
                <li>Redundant power and network connectivity</li>
                <li>Geographic distribution for disaster recovery</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Network Security</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Web Application Firewall (WAF) protection</li>
                <li>DDoS protection and mitigation</li>
                <li>Intrusion detection and prevention systems</li>
                <li>Network segmentation and isolation</li>
                <li>Regular penetration testing</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data Backup & Recovery</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Automated Backups</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Real-time data replication across multiple regions</li>
                <li>Daily encrypted backups with 30-day retention</li>
                <li>Point-in-time recovery capabilities</li>
                <li>Regular backup integrity testing</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Disaster Recovery</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>99.9% uptime SLA with automatic failover</li>
                <li>Recovery Time Objective (RTO) of less than 4 hours</li>
                <li>Recovery Point Objective (RPO) of less than 1 hour</li>
                <li>Regular disaster recovery testing and drills</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Monitoring & Incident Response</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">24/7 Security Monitoring</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Real-time security event monitoring</li>
                <li>Automated threat detection and alerting</li>
                <li>Security Information and Event Management (SIEM)</li>
                <li>Behavioral analysis and anomaly detection</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Incident Response</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Dedicated security incident response team</li>
                <li>Documented incident response procedures</li>
                <li>Immediate containment and remediation protocols</li>
                <li>Transparent communication with affected customers</li>
                <li>Post-incident analysis and improvement processes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Compliance & Certifications</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Educational Compliance</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>FERPA (Family Educational Rights and Privacy Act) compliance</li>
                <li>Uganda Data Protection and Privacy Act compliance</li>
                <li>GDPR compliance for international users</li>
                <li>Regular compliance audits and assessments</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Security Standards</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>ISO 27001 Information Security Management</li>
                <li>SOC 2 Type II certification</li>
                <li>OWASP security guidelines adherence</li>
                <li>Regular third-party security assessments</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Employee Security</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Background Checks & Training</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Comprehensive background checks for all employees</li>
                <li>Regular security awareness training</li>
                <li>Confidentiality and non-disclosure agreements</li>
                <li>Secure development lifecycle training</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Access Management</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Strict need-to-know access policies</li>
                <li>Regular access reviews and certifications</li>
                <li>Immediate access revocation upon termination</li>
                <li>Segregation of duties for critical operations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Vulnerability Management</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Regular Security Testing</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Quarterly penetration testing by certified professionals</li>
                <li>Automated vulnerability scanning</li>
                <li>Code security reviews and static analysis</li>
                <li>Dependency scanning for third-party components</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Patch Management</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Automated security patch deployment</li>
                <li>Critical vulnerability response within 24 hours</li>
                <li>Regular system updates and maintenance</li>
                <li>Change management and testing procedures</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Your Role in Security</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                While we provide robust security measures, security is a shared responsibility. Here's how you can help keep your data secure:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Use strong, unique passwords for your PwezaCore account</li>
                <li>Enable multi-factor authentication</li>
                <li>Keep your devices and browsers updated</li>
                <li>Don't share login credentials</li>
                <li>Log out when using shared computers</li>
                <li>Report suspicious activity immediately</li>
                <li>Regularly review user access and permissions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Transparency & Communication</h2>
              
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Security Updates</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                We believe in transparency about our security practices. We regularly update our security measures and will communicate any significant changes or incidents that may affect your data.
              </p>

              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Incident Notification</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                In the unlikely event of a security incident that affects your data, we will:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-1">
                <li>Notify affected customers within 72 hours</li>
                <li>Provide clear information about what happened</li>
                <li>Explain what data was involved</li>
                <li>Detail the steps we're taking to address the issue</li>
                <li>Provide guidance on protective actions you can take</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Contact Our Security Team</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                If you have questions about our security practices or need to report a security concern, please contact our security team:
              </p>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
                <p className="text-gray-600 dark:text-gray-300 mb-2"><strong>Security Email:</strong> security@pwezacore.com</p>
                <p className="text-gray-600 dark:text-gray-300 mb-2"><strong>General Support:</strong> +256 394 529 753</p>
                <p className="text-gray-600 dark:text-gray-300 mb-2"><strong>WhatsApp:</strong> +256 742 490 303</p>
                <p className="text-gray-600 dark:text-gray-300"><strong>Emergency Hotline:</strong> Available 24/7 for critical security issues</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Continuous Improvement</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Security is not a destination but a journey. We continuously evaluate and improve our security measures to stay ahead of emerging threats. We regularly review industry best practices, participate in security communities, and invest in new technologies to ensure your data remains protected.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              This Security Statement is effective as of April 30, 2026
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/privacy-policy"
                className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                View Privacy Policy
              </Link>
              <Link
                to="/"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
