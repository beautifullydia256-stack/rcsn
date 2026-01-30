import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Privacy policy content. See your legal docs for full text.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700">Back to Home</Link>
      </div>
    </div>
  );
}
