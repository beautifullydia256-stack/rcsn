import { Link } from 'react-router-dom';
import { GlassCard } from '../components/Glass/GlassCard';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-6">
        <GlassCard title="Welcome to PwezaCore">
          <p className="text-muted-foreground mb-6">
            Multi-tenant school management SaaS platform
          </p>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="btn-glass"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="btn-glass"
            >
              Register
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}




