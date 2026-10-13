"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
export default function LoginPage() {
  const [mode, setMode] =
    useState<"login" | "signup">("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);
  const [resetLoading, setResetLoading] =
    useState(false);

  async function routeUser(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("Role lookup error:", error);

      setMessage(
        "Login succeeded, but SurgiCare could not open your workspace."
      );

      return;
    }

    if (data.role === "admin") {
      window.location.href = "/admin";
      return;
    }

    if (data.role === "coordinator") {
      window.location.href = "/coordinator";
      return;
    }

    window.location.href = "/dashboard";
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      /*
        ==============================
        SIGN UP
        ==============================
      */

      if (mode === "signup") {
        const { data, error } =
          await supabase.auth.signUp({
            email,
            password,

            options: {
              data: {
                full_name: fullName,
              },
            },
          });

        if (error) {
          setMessage(error.message);
          return;
        }

        if (data.session && data.user) {
          await routeUser(data.user.id);
          return;
        }

        setMessage(
          "Account created successfully. Check your email if confirmation is required, then sign in."
        );

        return;
      }

      /*
        ==============================
        EMAIL LOGIN
        ==============================
      */

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user) {
        setMessage(
          "SurgiCare could not load your account."
        );

        return;
      }

      await routeUser(data.user.id);
    } catch (error) {
      console.error(
        "SurgiCare authentication error:",
        error
      );

      setMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ==============================
    GOOGLE LOGIN
    ==============================
  */

  async function handleGoogleLogin() {
    setMessage("");
    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              prompt: "select_account",
            },
          },
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(
        "Google login error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Google sign-in failed."
      );

      setLoading(false);
    }
  }

  /*
    ==============================
    PASSWORD RESET
    ==============================
  */

  async function handleForgotPassword() {
    setMessage("");

    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (!cleanEmail) {
      setMessage(
        "Enter your email address first, then select Forgot password."
      );

      return;
    }

    setResetLoading(true);

    try {
      const redirectTo =
        `${window.location.origin}/auth/reset-password`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "Password reset email sent. Check your inbox and follow the link to create a new password."
      );
    } catch (error) {
      console.error(
        "Password reset error:",
        error
      );

      setMessage(
        "Could not send the password reset email. Please try again."
      );
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6faf8] lg:grid lg:grid-cols-2">
      {/* LEFT BRAND PANEL */}

      <section className="relative hidden overflow-hidden bg-[#087f6b] lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-white/5" />

        <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#087f6b]">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path
                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">
                SurgiCare
              </h1>

              <p className="text-sm text-emerald-100">
                Mobile Eye-Care Network
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            Smarter outreach
          </span>

          <h2 className="mt-5 text-5xl font-bold leading-tight tracking-tight text-white">
            Bringing essential eye care closer
            to the communities that need it.
          </h2>

          <p className="mt-6 max-w-lg text-lg leading-8 text-emerald-50">
            Coordinate facilities, register
            patients, support outreach planning
            and improve access to cataract and
            pterygium care.
          </p>
        </div>

        <p className="relative z-10 text-sm text-emerald-100">
          SurgiCare Outreach Platform
        </p>
      </section>

      {/* RIGHT AUTH PANEL */}

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* MOBILE BRAND */}

          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#087f6b] text-white">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path
                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                />
                <circle cx="12" cy="12" r="2.5" />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-[#10233c]">
                  SurgiCare
                </h1>

                <p className="text-xs font-semibold text-[#087f6b]">
                  Mobile Eye-Care Network
                </p>
              </div>
            </div>
          </div>

          <span className="inline-flex rounded-full bg-[#e7f6f1] px-3 py-1 text-xs font-semibold text-[#087f6b]">
            Secure platform access
          </span>

          <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#10233c]">
            {mode === "login"
              ? "Welcome back"
              : "Create your SurgiCare account"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#65756f]">
            {mode === "login"
              ? "Sign in to access your assigned SurgiCare workspace."
              : "Create your account to begin using the SurgiCare platform."}
          </p>

          {/* LOGIN / SIGNUP SWITCH */}

          <div className="mt-8 grid grid-cols-2 rounded-xl bg-[#edf4f1] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white text-[#087f6b] shadow-sm"
                  : "text-[#65756f]"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "signup"
                  ? "bg-white text-[#087f6b] shadow-sm"
                  : "text-[#65756f]"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >
            {mode === "signup" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#10233c]">
                  Full name
                </label>

                <input
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  required
                  className={inputClass}
                  placeholder="Enter full name"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#10233c]">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
                autoComplete="email"
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            {/* PASSWORD */}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-[#10233c]">
                  Password
                </label>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={
                      handleForgotPassword
                    }
                    disabled={resetLoading}
                    className="text-xs font-semibold text-[#087f6b] hover:underline disabled:opacity-50"
                  >
                    {resetLoading
                      ? "Sending..."
                      : "Forgot password?"}
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  minLength={6}
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  className={`${inputClass} pr-14`}
                  placeholder="Enter password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[#65756f] transition hover:text-[#087f6b]"
                >
                  {showPassword ? (
                    /* EYE OFF */
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 9 4 10 8a12.7 12.7 0 0 1-2.2 4.2" />
                      <path d="M6.6 6.6A12.4 12.4 0 0 0 2 12c1 4 5 8 10 8a10.7 10.7 0 0 0 5.4-1.4" />
                    </svg>
                  ) : (
                    /* EYE */
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {message && (
              <div className="rounded-xl border border-[#cce9df] bg-[#eef9f5] p-4 text-sm leading-5 text-[#08705f]">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading || googleLoading
              }
              className="w-full rounded-xl bg-[#087f6b] py-3.5 font-semibold text-white transition hover:bg-[#056554] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </button>
          </form>

          {/* GOOGLE AUTH */}

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#dfe9e5]" />

            <span className="text-xs font-semibold uppercase tracking-wider text-[#8b9994]">
              Or
            </span>

            <div className="h-px flex-1 bg-[#dfe9e5]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={
              googleLoading || loading
            }
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#dfe9e5] bg-white py-3.5 text-sm font-semibold text-[#10233c] transition hover:border-[#c5d8d1] hover:bg-[#fbfdfc] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {/* GOOGLE G */}

            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41z"
              />

              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.97-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22z"
              />

              <path
                fill="#FBBC05"
                d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.55l3.35-2.62z"
              />

              <path
                fill="#EA4335"
                d="M12 5.94c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94z"
              />
            </svg>

            {googleLoading
              ? "Connecting to Google..."
              : mode === "signup"
              ? "Sign up with Google"
              : "Continue with Google"}
          </button>

          {/* FOOTER */}

          <div className="mt-7 text-center">
            <p className="text-xs leading-5 text-[#7a8984]">
              Secure access to your assigned
              SurgiCare workspace.
            </p>

            <p className="mt-1 text-xs leading-5 text-[#9aa7a2]">
              Patient and operational
              information must be handled
              securely.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#dfe9e5] bg-white px-4 py-3.5 text-[#10231f] outline-none transition placeholder:text-slate-400 focus:border-[#087f6b] focus:ring-4 focus:ring-[#087f6b]/10";