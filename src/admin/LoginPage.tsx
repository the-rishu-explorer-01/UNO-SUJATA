import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAdminAuth } from "@/admin/AdminAuth";
import { AdminApiError } from "@/admin/api";
import { Button, Field, Notice, TextInput } from "@/admin/ui";

/** Only same-app paths are allowed as the post-login destination, so the parameter cannot redirect off-site. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) return "/admin";
  return value;
}

export default function LoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 429) setError(err.message);
      else if (err instanceof AdminApiError && err.status === 401) setError("Email or password is incorrect.");
      else if (err instanceof AdminApiError && err.status === 422) setError("Check your email and password and try again.");
      else setError(err instanceof AdminApiError ? err.message : "Could not sign in. Please try again.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-steel px-4 py-12">
      <div className="w-full max-w-md border border-graphite bg-bone p-8 shadow-xl sm:p-10">
        <div className="flex items-center gap-3">
          <Lock size={20} className="text-brass-deep" aria-hidden="true" />
          <p className="font-mono text-[11px] uppercase tracking-technical text-ink/60">Staff sign in</p>
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold">UNO SUJATA Admin</h1>
        <p className="mt-2 font-body text-sm text-ink/65">For authorised staff only. Sign-in attempts are recorded.</p>

        <form onSubmit={submit} noValidate className="mt-8 space-y-5">
          {error && <Notice kind="error">{error}</Notice>}
          <Field label="Email" htmlFor="email">
            <TextInput id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
          </Field>
          <Field label="Password" htmlFor="password">
            <TextInput id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
          </Field>
          <Button type="submit" variant="primary" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
