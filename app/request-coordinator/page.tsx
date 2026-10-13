"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Profile = {
  full_name: string | null;
  role: string;
};

type RequestRow = {
  id: string;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export default function CoordinatorRequestPage() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [request, setRequest] =
    useState<RequestRow | null>(null);

  const [reason, setReason] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", session.user.id)
        .single();

    if (profileError || !profileData) {
      setError(
        "SurgiCare could not load your profile."
      );

      setLoading(false);
      return;
    }

    setProfile(profileData);

    const { data: requestData, error: requestError } =
      await supabase
        .from("coordinator_requests")
        .select(
          `
          id,
          reason,
          status,
          admin_note,
          created_at,
          reviewed_at
          `
        )
        .eq("user_id", session.user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (requestError) {
      console.error(requestError);
    }

    setRequest(requestData || null);

    setLoading(false);
  }

  async function submitRequest(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!reason.trim()) {
      setError(
        "Please explain why you need coordinator access."
      );

      return;
    }

    setSubmitting(true);

    const { error } = await supabase.rpc(
      "submit_coordinator_request",
      {
        p_reason: reason.trim(),
      }
    );

    if (error) {
      console.error(error);
      setError(error.message);
      setSubmitting(false);
      return;
    }

    setMessage(
      "Your coordinator access request has been submitted to a SurgiCare administrator."
    );

    setReason("");

    await loadPage();

    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm text-[#65756f]">
            Loading access request...
          </p>
        </div>
      </main>
    );
  }

  if (
    profile?.role === "coordinator" ||
    profile?.role === "admin"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] px-5">
        <div className="w-full max-w-xl rounded-3xl border border-[#dfe9e5] bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f6f1] text-2xl text-[#087f6b]">
            ✓
          </div>

          <h1 className="mt-5 text-2xl font-bold text-[#10233c]">
            Coordinator access already available
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#65756f]">
            Your SurgiCare account already has elevated access.
          </p>

          <button
            onClick={() => {
              window.location.href =
                profile.role === "admin"
                  ? "/admin"
                  : "/coordinator";
            }}
            className="mt-7 w-full rounded-xl bg-[#087f6b] px-5 py-3.5 font-semibold text-white"
          >
            Open workspace
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      <header className="border-b border-[#dfe9e5] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold text-[#10233c]">
              SurgiCare
            </h1>

            <p className="text-xs font-semibold text-[#087f6b]">
              Coordinator Access Request
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="rounded-xl border border-[#dfe9e5] px-4 py-2 text-sm font-semibold text-[#52635d]"
          >
            Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8">
        <section className="rounded-3xl bg-[#087f6b] p-8 text-white">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            Access request
          </span>

          <h2 className="mt-4 text-3xl font-bold">
            Request Coordinator Access
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
            Coordinator access provides entry to the SurgiCare
            Control Tower, facility review and outreach planning
            tools. Administrator approval is required.
          </p>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-4 text-sm text-[#08705f]">
            {message}
          </div>
        )}

        {request?.status === "pending" ? (
          <section className="mt-8 rounded-3xl border border-[#f1dfae] bg-[#fff9e8] p-7">
            <p className="text-sm font-semibold text-[#8a6800]">
              Request pending
            </p>

            <h3 className="mt-2 text-2xl font-bold text-[#10233c]">
              Administrator review required
            </h3>

            <p className="mt-4 text-sm leading-6 text-[#65756f]">
              Your request was submitted on{" "}
              {new Date(
                request.created_at
              ).toLocaleDateString()}.
            </p>

            <div className="mt-5 rounded-2xl bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
                Your reason
              </p>

              <p className="mt-2 text-sm leading-6 text-[#52635d]">
                {request.reason}
              </p>
            </div>
          </section>
        ) : (
          <>
            {request?.status === "rejected" && (
              <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-7">
                <p className="font-semibold text-red-700">
                  Previous request declined
                </p>

                {request.admin_note && (
                  <p className="mt-3 text-sm text-red-700">
                    Admin note: {request.admin_note}
                  </p>
                )}

                <p className="mt-3 text-sm text-[#65756f]">
                  You may submit a new request if your circumstances
                  have changed.
                </p>
              </section>
            )}

            <form
              onSubmit={submitRequest}
              className="mt-8 rounded-3xl border border-[#dfe9e5] bg-white p-7"
            >
              <h3 className="text-xl font-bold text-[#10233c]">
                Why do you need coordinator access?
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#65756f]">
                Explain your operational responsibilities or why
                you need access to the Control Tower.
              </p>

              <textarea
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                rows={6}
                placeholder="Example: I am responsible for coordinating outreach activities across multiple facilities in my district..."
                className="mt-5 w-full resize-none rounded-xl border border-[#dfe9e5] px-4 py-3.5 text-sm outline-none focus:border-[#087f6b] focus:ring-4 focus:ring-[#087f6b]/10"
              />

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full rounded-xl bg-[#087f6b] px-5 py-3.5 font-semibold text-white disabled:opacity-60"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit coordinator request"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}