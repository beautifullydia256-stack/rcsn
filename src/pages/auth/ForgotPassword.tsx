import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white/10 backdrop-blur-md p-8 border border-white/10 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Forgot password?</h1>
        <p className="text-white/80 mb-6">Password reset flow coming soon. Please contact support.</p>
        <Link to="/login" className="text-blue-300 hover:text-blue-200">Back to Sign In</Link>
      </div>
    </div>
  );
}
