import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError) {
          setError(sessionError.message);
          setTimeout(() => navigate("/login"), 3000);
          return;
        }
        if (session?.user) {
          navigate("/", { replace: true });
          return;
        }
        // Session may have been set from URL hash (email confirm / password reset)
        const { data: { session: session2 } } = await supabase.auth.getSession();
        if (session2?.user) {
          navigate("/", { replace: true });
          return;
        }
        navigate("/login", { replace: true });
      } catch {
        if (!cancelled) {
          setError("Verification failed");
          setTimeout(() => navigate("/login"), 3000);
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--gradient-hero)" }}>
      <div className="text-center">
        <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4 animate-float" />
        <Loader2 className="h-6 w-6 text-primary mx-auto animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">
          {error || "Verifying your account..."}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
