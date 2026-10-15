import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { requestPasswordReset, signIn } from "@/services/firebase/auth";
import { ROUTES } from "@/constants/routes";

/**
 * Admin Login - Document 07. The ONLY entry point into the CMS.
 * There is no signup/register flow anywhere - this
 * app has exactly one administrator account, created directly in the
 * Firebase console.
 */
export default function AdminLogin() {
  const { isAuthenticated, isLoading: isCheckingSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in - skip straight to the dashboard.
  if (!isCheckingSession && isAuthenticated) {
    const redirectTo =
      (location.state as { from?: Location })?.from?.pathname ??
      ROUTES.dashboard;
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      navigate(ROUTES.dashboard, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgot() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Type your admin email above first, then tap Forgot password.");
      return;
    }
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setNotice("If that email has an account, a reset link is on its way. Check your inbox and spam.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-page-title text-text">
            DG <span className="text-accent">Tribune</span>
          </h1>
          <p className="mt-1 text-body text-text-secondary">
            Administrator sign in
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-border bg-surface p-6 space-y-4"
        >
          <Input
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-small text-danger" role="alert">
              {error}
            </p>
          )}

          {notice && (
            <p className="text-small text-accent" role="status">
              {notice}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isSubmitting}
          >
            Sign in
          </Button>
          <button
            type="button"
            onClick={handleForgot}
            disabled={isSubmitting}
            className="w-full text-center text-small text-text-secondary hover:text-accent disabled:opacity-50"
          >
            Forgot password?
          </button>
        </form>
      </div>
    </div>
  );
}
