"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

// ── GitHub SVG Icon ─────────────────────────────────────────────
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const authError = searchParams.get("error");
  const sessionExpired =
    searchParams.get("session_expired") === "true" || authError === "unauthorized";

  const { session } = useAuth();

  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    authError === "auth_failed" ? "Authentication failed. Please try again." : null
  );

  // ── GitHub OAuth ────────────────────────────────────────────
  const handleGitHubLogin = async () => {
    try {
      setIsGitHubLoading(true);
      setErrorMsg(null);
      await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "GitHub authentication failed");
      setIsGitHubLoading(false);
    }
  };

  // ── Email / Password Sign In ────────────────────────────────
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      setIsEmailLoading(true);
      setErrorMsg(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(from);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const anyLoading = isGitHubLoading || isEmailLoading;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#07080d] text-slate-900 dark:text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
      {/* Ambient Cosmic Indigo & Violet Spotlight */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-28 left-1/2 -translate-x-1/2 w-[850px] h-[420px] rounded-full blur-[140px] opacity-25 dark:opacity-35"
          style={{
            background:
              "radial-gradient(circle, #6366f1 0%, #8b5cf6 45%, #38bdf8 85%, transparent 100%)",
          }}
        />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(99,102,241,0.35)]">
            <div className="w-3.5 h-3.5 rounded-sm bg-gradient-to-tr from-indigo-500 via-violet-500 to-sky-400 rotate-45" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-slate-950 dark:text-white font-mono">
              Reflex
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-semibold">
              v2.0
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors flex items-center gap-1.5 font-mono"
          >
            Back to Home
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5">
          {/* Active Session Notice Banner */}
          {session && (
            <div className="p-3.5 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 text-slate-900 dark:text-indigo-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>
                  Signed in as{" "}
                  <strong className="text-slate-950 dark:text-white font-mono">
                    {session.user?.email || "SRE Engineer"}
                  </strong>
                </span>
              </div>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold text-[11px] transition-all flex items-center gap-1 flex-shrink-0 font-mono"
              >
                <LayoutDashboard className="w-3 h-3" />
                <span>Dashboard</span>
              </Link>
            </div>
          )}

          {/* Session Expiry Banner */}
          {sessionExpired && (
            <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5 font-mono">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Center-Stage Card */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0b0d17]/95 backdrop-blur-2xl p-8 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.25)] space-y-6">
            {/* Title */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Secure Authentication
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white font-mono">
                Sign in to Reflex
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                Access autonomous remediation, verified pull requests, and SRE telemetry.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3.5">
              {/* GitHub OAuth */}
              <button
                type="button"
                onClick={handleGitHubLogin}
                disabled={anyLoading}
                className="w-full h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed font-mono"
              >
                {isGitHubLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GitHubIcon className="w-5 h-5" />
                )}
                <span>Continue with GitHub</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
                  or
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-[#07080d] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-[#07080d] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={anyLoading}
                  className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold text-xs border border-indigo-500/30 shadow-[0_4px_20px_rgba(99,102,241,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                >
                  {isEmailLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In with Email</span>
                  )}
                </button>
              </form>
            </div>

            {/* Footer / Links */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/signup?from=${encodeURIComponent(from)}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono font-semibold"
                >
                  Create one now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 h-16 flex items-center justify-between text-xs text-slate-500 font-mono">
        <div>&copy; {new Date().getFullYear()} Reflex Inc.</div>
        <div className="flex gap-4">
          <Link href="/" className="hover:text-indigo-400 transition-colors">
            Privacy
          </Link>
          <Link href="/" className="hover:text-indigo-400 transition-colors">
            Terms
          </Link>
          <Link href="/" className="hover:text-indigo-400 transition-colors">
            Security
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#07080d] flex items-center justify-center text-slate-500 font-mono text-xs">
          Loading login...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}