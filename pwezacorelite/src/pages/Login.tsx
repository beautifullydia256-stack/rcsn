import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/GlassCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let emailVal = (email || "").trim();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailVal,
        password,
      });

      if (authError) {
        if (
          authError.message.includes("email not confirmed") ||
          authError.message.includes("Email not confirmed")
        ) {
          setError("Please check your email and click the confirmation link before logging in.");
        } else {
          setError(authError.message || "Invalid login credentials");
        }
        return;
      }

      if (!data?.user) {
        setError("Login failed - no user data received");
        return;
      }

      if (rememberMe && data.session && typeof window !== "undefined") {
        const { access_token, refresh_token } = data.session;
        if (access_token && refresh_token) {
          window.localStorage.setItem(
            "pwezacorelite_remember",
            JSON.stringify({ access_token, refresh_token })
          );
        }
      }

      // Resolve role from users table (same as main app)
      let role = (data.user?.user_metadata?.role as string)?.toLowerCase() ?? "";
      if (!role && data.user?.id) {
        const { data: userRows } = await supabase
          .from("users")
          .select("role")
          .eq("user_id", data.user.id)
          .limit(1);
        role = (userRows?.[0]?.role ?? "").toLowerCase();
      }
      if (!role && (data.user?.user_metadata as { student_id?: string })?.student_id) {
        role = "student";
      }

      // Redirect to home; you can add role-based redirect or link to main app later
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-glow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl animate-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <GlassCard className="w-full max-w-md p-8 relative z-10" hover={false}>
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-xl font-bold mb-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="gradient-text">PwezaCore</span>
          </Link>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(!!c)} />
              <Label htmlFor="remember" className="text-sm cursor-pointer">Remember me</Label>
            </div>
            <Link to="/auth/forgot" className="text-sm text-primary hover:underline">Forgot password?</Link>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full gradient-btn rounded-lg" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
          </Button>
          <Button type="button" variant="outline" className="w-full rounded-lg" disabled>
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign in with Google (coming soon)
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">Register your school</Link>
        </p>
      </GlassCard>
    </div>
  );
};

export default Login;
