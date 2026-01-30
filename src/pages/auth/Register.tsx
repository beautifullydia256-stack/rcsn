import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/Glass/GlassCard';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    adminName: '',
    schoolName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call the registration RPC
      const { data, error: rpcError } = await supabase.rpc('register_school_admin_final', {
        p_email: formData.email,
        p_password: formData.password,
        p_admin_name: formData.adminName,
        p_school_name: formData.schoolName,
        p_phone: formData.phone,
      });

      if (rpcError) throw rpcError;

      if (data?.success) {
        navigate('/login');
      } else {
        throw new Error(data?.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="max-w-md w-full" title="Register School">
        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Admin Name</label>
            <input
              type="text"
              value={formData.adminName}
              onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
              className="input-glass"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">School Name</label>
            <input
              type="text"
              value={formData.schoolName}
              onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
              className="input-glass"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-glass"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-glass"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-glass"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-glass w-full"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </GlassCard>
    </div>
  );
}




