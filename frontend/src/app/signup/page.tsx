"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
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

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState(false);

  // ── GitHub OAuth ────────────────────────────────────────────
  const handleGitHubSignUp = async () => {
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
      setErrorMsg(err instanceof Error ? err.message : "GitHub registration failed");
    } finally {
      setIsGitHubLoading(false);
    }
  };

  // ── Email / Password Sign Up ────────────────────────────────
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    try {
      setIsEmailLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim() || email.split("@")[0],
          },
        },
      });

      if (error) throw error;

      // If email confirmation is required by Supabase project
      if (data?.user && !data.session) {
        setConfirmationNotice(true);
      } else {
        router.push(from);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const anyLoading = isGitHubLoading || isEmailLoading;

  return (
    <div className="min-h-screen bg-[#000000] dark:bg-[#000000] light:bg-[#ffffff] text-zinc-100 dark:text-zinc-100 light:text-zinc-900 flex flex-col justify-between relative overflow-hidden transition-colors duration-200">
      {/* Ambient Glow Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform glow-emerald">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white dark:text-white light:text-zinc-950 font-mono">AutoHeal AI</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.05] dark:bg-white/[0.05] light:bg-zinc-100 text-zinc-400 dark:text-zinc-400 light:text-zinc-600 border border-white/10 dark:border-white/10 light:border-zinc-200 font-semibold">
              v1.0
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors flex items-center gap-1.5 font-mono"
          >
            Back to Overview
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Auth Card (Apple Liquid Glass Elevated) */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl liquid-glass border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 glow-crimson font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Confirmation Notice Screen */}
          {confirmationNotice ? (
            <div className="rounded-3xl liquid-glass-elevated p-8 sm:p-9 space-y-6 text-center animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto glow-emerald">
                <MailCheck className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-white dark:text-white light:text-zinc-950 font-mono">Check your email</h1>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed max-w-sm mx-auto font-sans">
                  We sent a confirmation link to{" "}
                  <span className="text-white dark:text-white light:text-zinc-950 font-medium font-mono">{email}</span>. Click the link in your email to
                  activate your account and access your dashboard.
                </p>
              </div>

              <div className="pt-2 space-y-3 font-mono">
                <Link
                  href="/login"
                  className="w-full h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs border border-emerald-500/30 glow-emerald transition-colors flex items-center justify-center gap-2"
                >
                  Proceed to Sign In
                </Link>

                <button
                  type="button"
                  onClick={() => setConfirmationNotice(false)}
                  className="text-xs text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-950 transition-colors"
                >
                  Need to change your email? Go back
                </button>
              </div>
            </div>
          ) : (
            /* Sign Up Card */
            <div className="rounded-3xl liquid-glass-elevated p-8 sm:p-9 space-y-6">
              {/* Title */}
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono font-medium text-emerald-400 glow-emerald">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Enterprise Reliability
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white dark:text-white light:text-zinc-950 font-mono">Create an Account</h1>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 leading-relaxed max-w-sm mx-auto font-sans">
                  Get started with autonomous crash remediation, Docker sandbox verification, and AI PRs.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {/* GitHub OAuth */}
                <button
                  type="button"
                  onClick={handleGitHubSignUp}
                  disabled={anyLoading}
                  className="w-full h-11 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                >
                  {isGitHubLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  ) : (
                    <GitHubIcon className="w-5 h-5" />
                  )}
                  <span>Continue with GitHub</span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-white/10 dark:bg-white/10 light:border-zinc-200" />
                  <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-white/10 dark:bg-white/10 light:border-zinc-200" />
                </div>

                {/* Email / Password Sign Up Form */}
                <form onSubmit={handleEmailSignUp} className="space-y-3">
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Full Name (optional)"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-300 text-sm text-white dark:text-white light:text-zinc-950 placeholder-zinc-500 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all font-sans"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-300 text-sm text-white dark:text-white light:text-zinc-950 placeholder-zinc-500 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all font-sans"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Password (min. 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-300 text-sm text-white dark:text-white light:text-zinc-950 placeholder-zinc-500 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={anyLoading}
                    className="w-full h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs border border-emerald-500/30 glow-emerald transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                  >
                    {isEmailLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <span>Create Account with Email</span>
                    )}
                  </button>
                </form>
              </div>

              {/* Footer / Links */}
              <div className="text-center pt-2">
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 font-sans">
                  Already have an account?{" "}
                  <Link
                    href={`/login?from=${encodeURIComponent(from)}`}
                    className="text-emerald-400 hover:underline font-mono font-medium"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 h-16 flex items-center justify-between text-xs text-zinc-500 font-mono">
        <div>&copy; {new Date().getFullYear()} AutoHeal AI Systems Inc.</div>
        <div className="flex gap-4">
          <Link href="/" className="hover:text-zinc-400 transition-colors">Privacy</Link>
          <Link href="/" className="hover:text-zinc-400 transition-colors">Terms</Link>
          <Link href="/" className="hover:text-zinc-400 transition-colors">Security</Link>
        </div>
      </footer>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs">
          Loading sign up...
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
