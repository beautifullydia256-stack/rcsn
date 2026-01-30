import { Link } from 'react-router-dom';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Contact / Request Demo</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Contact and demo request form coming soon.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700">Back to Home</Link>
      </div>
    </div>
  );
}
