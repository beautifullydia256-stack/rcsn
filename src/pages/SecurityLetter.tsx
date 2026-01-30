import { Link } from 'react-router-dom';

export default function SecurityLetterPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Security Statement</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Security statement content. See your legal docs for full text.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700">Back to Home</Link>
      </div>
    </div>
  );
}
