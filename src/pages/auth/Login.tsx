import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setRole } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Get user role
        const { data: userData } = await supabase
          .from('users')
          .select('role, school_id')
          .eq('user_id', data.user.id)
          .single();

        setUser(data.user);
        setRole(userData?.role || data.user.user_metadata?.role || 'student');

        // Redirect to appropriate dashboard
        const role = userData?.role || data.user.user_metadata?.role || 'student';
        navigate(`/dashboard/${role === 'admin' ? 'admin' : role}`);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="max-w-md w-full" title="Login">
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-glass"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-glass"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-glass w-full"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </GlassCard>
    </div>
  );
}




