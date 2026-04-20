import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";

const REFERRAL_STORAGE = "pwezacore_referral_jwt";

function registerApiUrl(path: string): string {
  const fromEnv = import.meta.env.VITE_API_ORIGIN as string | undefined;
  const base = (fromEnv || (typeof window !== "undefined" ? window.location.origin : "") || "").replace(
    /\/$/,
    ""
  );
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

const Register = () => {
  const navigate = useNavigate();
  const [referralVerified, setReferralVerified] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [referralToken, setReferralToken] = useState<string | null>(null);
  const [registeringUnder, setRegisteringUnder] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: "",
    schoolCode: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    schoolType: "Nursery/Primary" as "Nursery/Primary" | "Secondary",
    schoolLocation: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const adminName = `${(formData.firstName || "").trim()} ${(formData.lastName || "").trim()}`.trim();

  useEffect(() => {
    try {
      const t = sessionStorage.getItem(REFERRAL_STORAGE);
      if (t) setReferralToken(t);
    } catch {
      /* ignore */
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "schoolName" && value.trim()) {
      generateSchoolCode(value.trim());
    }
  };

  const generateSchoolCode = async (schoolName: string) => {
    try {
      const { data, error: err } = await supabase.rpc("generate_unique_school_code", {
        p_school_name: schoolName,
        p_branch_name: null,
      });
      if (err) return;
      if (data != null) {
        const code = typeof data === "string" ? data : String(data);
        setFormData((prev) => ({ ...prev, schoolCode: code }));
      }
    } catch {
      // ignore
    }
  };

  const handleVerifyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setError("");
    try {
      const res = await fetch(registerApiUrl("/api/referrals/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralCodeInput }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string"
            ? json.error
            : "Invalid or inactive referral code. Please contact support."
        );
        return;
      }
      const token = typeof json.token === "string" ? json.token : "";
      if (!token) {
        setError("Invalid or inactive referral code. Please contact support.");
        return;
      }
      setReferralToken(token);
      try {
        sessionStorage.setItem(REFERRAL_STORAGE, token);
      } catch {
        /* ignore */
      }
      setRegisteringUnder(typeof json.registeringUnder === "string" ? json.registeringUnder : null);
      setReferralVerified(true);
    } catch {
      setError("Invalid or inactive referral code. Please contact support.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const token =
      referralToken || (typeof window !== "undefined" ? sessionStorage.getItem(REFERRAL_STORAGE) : null);
    if (!token) {
      setError("Invalid or inactive referral code. Please contact support.");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    if (!formData.schoolName.trim() || !adminName || !formData.schoolLocation.trim()) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }
    if (!["Nursery/Primary", "Secondary"].includes(formData.schoolType)) {
      setError("Invalid school type");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(registerApiUrl("/api/register/school"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralToken: token,
          email: formData.email,
          password: formData.password,
          adminName,
          phone: "",
          schoolName: formData.schoolName,
          schoolLocation: formData.schoolLocation,
          schoolType: formData.schoolType,
          schoolCode: formData.schoolCode,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Registration failed");
      }

      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (signErr) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      try {
        sessionStorage.removeItem(REFERRAL_STORAGE);
      } catch {
        /* ignore */
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <GlassCard className="w-full max-w-md p-8 relative z-10" hover={false}>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Registration successful</h2>
            <p className="text-sm text-muted-foreground">Redirecting to login...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-glow" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl animate-glow"
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      <GlassCard className="w-full max-w-lg p-8 relative z-10" hover={false}>
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-xl font-bold mb-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="gradient-text">PwezaCore</span>
          </Link>
          <p className="text-sm text-muted-foreground">Register your school (same database as PwezaCore)</p>
        </div>

        {!referralVerified ? (
          <form className="space-y-4" onSubmit={handleVerifyReferral}>
            <div className="space-y-2">
              <Label htmlFor="referralCode">Enter Referral Code</Label>
              <Input
                id="referralCode"
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value)}
                placeholder="Your referral code"
                autoComplete="off"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full gradient-btn rounded-lg" disabled={verifyLoading}>
              {verifyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline font-medium">
                Already have an account? Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {registeringUnder && (
              <p className="text-sm text-center rounded-md border border-primary/30 bg-primary/5 py-2 px-3">
                You are registering under: {registeringUnder}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                name="schoolName"
                placeholder="e.g. Sunrise Academy"
                value={formData.schoolName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolCode">School Code</Label>
              <Input
                id="schoolCode"
                name="schoolCode"
                placeholder="Auto-generated (e.g. KHS)"
                value={formData.schoolCode}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">Optional. Auto-generated from school name if left blank.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Admin First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Admin Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolType">School Type</Label>
              <select
                id="schoolType"
                name="schoolType"
                value={formData.schoolType}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Nursery/Primary">Nursery/Primary</option>
                <option value="Secondary">Secondary</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolLocation">School Location</Label>
              <Input
                id="schoolLocation"
                name="schoolLocation"
                placeholder="City, Country"
                value={formData.schoolLocation}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regEmail">Email</Label>
              <Input
                id="regEmail"
                name="email"
                type="email"
                placeholder="admin@school.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regPassword">Password</Label>
              <Input
                id="regPassword"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full gradient-btn rounded-lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </GlassCard>
    </div>
  );
};

export default Register;
