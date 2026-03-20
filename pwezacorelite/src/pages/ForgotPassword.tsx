import { Link } from "react-router-dom";
import { GraduationCap, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSent(false);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <GlassCard className="w-full max-w-md p-8 relative z-10" hover={false}>
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-xl font-bold mb-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="gradient-text">PwezaCore</span>
          </Link>
          <p className="text-sm text-muted-foreground">Enter your email to reset your password</p>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          {sent && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Check your email for the reset link.
            </p>
          )}
          <Button type="submit" className="w-full gradient-btn rounded-lg" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : "Send Reset Link"}
          </Button>
        </form>
        <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-primary hover:underline mt-4">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </GlassCard>
    </div>
  );
};

export default ForgotPassword;
