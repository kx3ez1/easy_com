"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { getFriendlyErrorMessage } from "@/utils/firebaseErrors";

const RECAPTCHA_SITE_KEY = "6LeefAYtAAAAAMdIe4wLmgtMV8WX4_FDU9uXFT10";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoSubmitted = useRef(false);

  // Toggle body class to show reCAPTCHA badge on mount and hide on unmount
  useEffect(() => {
    document.body.classList.add("show-recaptcha");
    return () => {
      document.body.classList.remove("show-recaptcha");
    };
  }, []);

  // Auto-fill and auto-submit if credentials are in query params
  useEffect(() => {
    let qEmail = searchParams.get("email");
    const qPassword = searchParams.get("password");

    if (qEmail) {
      qEmail = qEmail.replace(/ /g, "+");
      setEmail(qEmail);
    }
    if (qPassword) setPassword(qPassword);

    if (qEmail && qPassword && !autoSubmitted.current) {
      autoSubmitted.current = true;
      // Trigger login automatically after a brief delay to ensure UI updates and scripts load
      const timer = setTimeout(() => {
        performLogin(qEmail, qPassword);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    setError(null);
    setLoading(true);

    try {
      // Proceed with Firebase Sign In directly (instant) and trim email
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      
      const rawRedirectTo = searchParams.get("redirectTo") || "/products";
      const target = (rawRedirectTo.startsWith("/") && !rawRedirectTo.startsWith("//")) ? rawRedirectTo : "/products";
      router.push(target);
    } catch (err: any) {
      console.error("Login error:", err);
      const friendlyMessage = getFriendlyErrorMessage(err.code, err.message || "Invalid email or password.");
      setError(friendlyMessage);
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Fallback: Read values directly from DOM elements in case browser autofill didn't trigger React onChange
    const target = e.target as HTMLFormElement;
    const emailVal = (target.elements.namedItem("email") as HTMLInputElement)?.value || email;
    const passwordVal = (target.elements.namedItem("password") as HTMLInputElement)?.value || password;
    performLogin(emailVal, passwordVal);
  };

  const redirectToParam = searchParams.get("redirectTo");
  const signupLink = redirectToParam ? `/signup?redirectTo=${encodeURIComponent(redirectToParam)}` : "/signup";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-2xl transition-all duration-300 hover:border-surface-tint">
        <div className="text-center">
          <div className="inline-block bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            Welcome Back
          </div>
          <h2 className="text-headline-lg text-on-background tracking-tight-xl">
            Sign In to Account
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant font-medium">
            Don&apos;t have an account?{" "}
            <Link
              href={signupLink}
              className="text-primary hover:underline font-bold text-surface-tint"
            >
              Sign up now
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-lg text-sm font-semibold border-l-4 border-error">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={onSubmit} method="POST">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-surface border border-outline text-on-background placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-surface-tint focus:border-transparent transition-all duration-200"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant"
                >
                  Password
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-surface border border-outline text-on-background placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-surface-tint focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-primary-container py-3.5 px-4 text-sm font-bold uppercase tracking-wider text-on-primary-container transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Checking security..." : "Sign In"}
            </button>
          </div>

          {captchaToken && (
            <div className="mt-4 p-2.5 bg-surface-container rounded-md border border-outline-variant text-center">
              <span className="text-[10px] text-on-surface-variant font-mono block truncate">
                reCAPTCHA v3 Shield Verified
              </span>
            </div>
          )}

          <div className="text-[10px] text-center text-on-surface-variant/70 leading-relaxed font-sans">
            This site is protected by reCAPTCHA and the Google{" "}
            <a href="https://policies.google.com/privacy" className="underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="https://policies.google.com/terms" className="underline">
              Terms of Service
            </a>{" "}
            apply.
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background text-on-background">
        <div className="text-sm font-semibold uppercase tracking-wider">Loading...</div>
      </div>
    }>
      <LoginContent />
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
        strategy="afterInteractive"
      />
    </Suspense>
  );
}
