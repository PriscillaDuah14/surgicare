"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] =
    useState(true);

  /*
    ========================================
    CHECK RECOVERY SESSION
    ========================================
  */

  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setCheckingSession(false);
          return;
        }

        /*
          Supabase may still be processing
          the recovery URL when this page
          first loads.

          Listen briefly for the recovery
          authentication event.
        */

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (
              event === "PASSWORD_RECOVERY" ||
              newSession
            ) {
              setCheckingSession(false);
            }
          }
        );

        const timeout = window.setTimeout(() => {
          setCheckingSession(false);
        }, 2000);

        return () => {
          window.clearTimeout(timeout);
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error(
          "Reset session check error:",
          error
        );

        setCheckingSession(false);
      }
    }

    const cleanupPromise = checkSession();

    return () => {
      cleanupPromise.then((cleanup) => {
        if (cleanup) {
          cleanup();
        }
      });
    };
  }, []);

  /*
    ========================================
    UPDATE PASSWORD
    ========================================
  */

  async function handleResetPassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    if (password.length < 6) {
      setMessage(
        "Your new password must contain at least 6 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        "The passwords do not match."
      );

      return;
    }

    setLoading(true);

    try {
      /*
        Make sure a recovery session exists.
      */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Recovery session error:",
          sessionError
        );
      }

      if (!session) {
        setMessage(
          "This password reset link is invalid or has expired. Please request a new reset link."
        );

        return;
      }

      /*
        Change the user's password.
      */

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        console.error(
          "Password update error:",
          error
        );

        setMessage(error.message);
        return;
      }

      setSuccess(true);

      setMessage(
        "Your password has been updated successfully."
      );

      setPassword("");
      setConfirmPassword("");

      /*
        Sign out the recovery session so
        the user signs in normally using
        their new password.
      */

      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Unexpected password reset error:",
        error
      );

      setMessage(
        "Could not update your password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ========================================
    LOADING
    ========================================
  */

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] px-5">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#d9ebe5] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Verifying your password reset
            link...
          </p>
        </div>
      </main>
    );
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
            Secure access
          </span>

          <h2 className="mt-5 text-5xl font-bold leading-tight tracking-tight text-white">
            Protecting access to critical
            eye-care operations.
          </h2>

          <p className="mt-6 max-w-lg text-lg leading-8 text-emerald-50">
            Create a new password to securely
            regain access to your SurgiCare
            workspace.
          </p>
        </div>

        <p className="relative z-10 text-sm text-emerald-100">
          SurgiCare Outreach Platform
        </p>
      </section>

      {/* RESET PANEL */}

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
            Account recovery
          </span>

          <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#10233c]">
            Create a new password
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#65756f]">
            Choose a new password for your
            SurgiCare account.
          </p>

          {!success ? (
            <form
              onSubmit={handleResetPassword}
              className="mt-8 space-y-5"
            >
              {/* NEW PASSWORD */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#10233c]">
                  New password
                </label>

                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    className={`${inputClass} pr-14`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[#7a8984] transition hover:text-[#087f6b]"
                  >
                    <EyeIcon
                      hidden={showPassword}
                    />
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#10233c]">
                  Confirm new password
                </label>

                <div className="relative">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Enter password again"
                    className={`${inputClass} pr-14`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-[#7a8984] transition hover:text-[#087f6b]"
                  >
                    <EyeIcon
                      hidden={
                        showConfirmPassword
                      }
                    />
                  </button>
                </div>
              </div>

              {message && (
                <div className="rounded-xl border border-[#f2d7d7] bg-[#fff7f7] px-4 py-3 text-sm leading-5 text-[#9b3030]">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#087f6b] px-5 py-3.5 font-semibold text-white transition hover:bg-[#056554] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Updating password..."
                  : "Update Password"}
              </button>
            </form>
          ) : (
            /* SUCCESS */

            <div className="mt-8 rounded-2xl border border-[#cce9df] bg-white p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f6f1] text-[#087f6b]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>

              <h3 className="mt-4 text-lg font-bold text-[#10233c]">
                Password updated
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#65756f]">
                Your SurgiCare password has
                been changed successfully.
                You can now sign in with your
                new password.
              </p>

              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    "/login";
                }}
                className="mt-5 w-full rounded-xl bg-[#087f6b] px-5 py-3.5 font-semibold text-white transition hover:bg-[#056554]"
              >
                Back to Login
              </button>
            </div>
          )}

          {!success && (
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/login";
              }}
              className="mt-6 w-full text-center text-sm font-semibold text-[#087f6b] hover:underline"
            >
              ← Back to login
            </button>
          )}

          <p className="mt-8 text-center text-xs leading-5 text-[#7a8984]">
            Authorized SurgiCare personnel
            only.
            <br />
            Patient information must be
            handled securely.
          </p>
        </div>
      </section>
    </main>
  );
}

/*
  ========================================
  PASSWORD EYE ICON
  ========================================
*/

function EyeIcon({
  hidden,
}: {
  hidden: boolean;
}) {
  if (hidden) {
    return (
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
    );
  }

  return (
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
  );
}

const inputClass =
  "w-full rounded-xl border border-[#dfe9e5] bg-white px-4 py-3.5 text-[#10231f] outline-none transition placeholder:text-slate-400 focus:border-[#087f6b] focus:ring-4 focus:ring-[#087f6b]/10";