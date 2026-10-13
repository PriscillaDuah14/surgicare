"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Facility = {
  id: string;

  name: string;

  facility_type: string | null;

  gps_address: string | null;

  district: string | null;

  region: string | null;

  verification_status: string;

  onboarding_step: number;

  readiness_completed_at: string | null;

  onboarding_completed_at: string | null;

  facility_code: string | null;
};

type GeneratedAccess = {
  facility_id: string;
  facility_name: string;
  facility_code: string;
  access_pin: string;
};

export default function FacilityConfirmationPage() {
  const [facility, setFacility] =
    useState<Facility | null>(null);

  const [generatedAccess, setGeneratedAccess] =
    useState<GeneratedAccess | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [copied, setCopied] =
    useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from("facility_staff")
        .select("facility_id")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

    if (membershipError) {
      console.error(membershipError);

      setError(
        "Unable to load your facility membership."
      );

      setLoading(false);
      return;
    }

    if (!membership) {
      window.location.href = "/facility";
      return;
    }

    const { data: facilityData, error: facilityError } =
      await supabase
        .from("facilities")
        .select(
          `
          id,
          name,
          facility_type,
          gps_address,
          district,
          region,
          verification_status,
          onboarding_step,
          readiness_completed_at,
          onboarding_completed_at,
          facility_code
          `
        )
        .eq(
          "id",
          membership.facility_id
        )
        .single();

    if (
      facilityError ||
      !facilityData
    ) {
      console.error(facilityError);

      setError(
        "Unable to load your facility."
      );

      setLoading(false);
      return;
    }

    /*
      Step 2 must be completed before confirmation.
    */

    if (
      !facilityData.readiness_completed_at &&
      facilityData.onboarding_step < 2
    ) {
      window.location.href =
        "/facility/readiness";

      return;
    }

    setFacility(
      facilityData
    );

    setLoading(false);
  }

  async function generateAccess() {
    setGenerating(true);
    setError("");
    setCopied("");

    const {
      data,
      error,
    } = await supabase.rpc(
      "generate_facility_access"
    );

    if (error) {
      console.error(error);

      setError(
        error.message
      );

      setGenerating(false);
      return;
    }

    if (
      !data ||
      data.length === 0
    ) {
      setError(
        "SurgiCare could not generate facility access."
      );

      setGenerating(false);
      return;
    }

    const access =
      data[0] as GeneratedAccess;

    setGeneratedAccess(
      access
    );

    setFacility(
      (current) =>
        current
          ? {
              ...current,

              facility_code:
                access.facility_code,

              onboarding_step:
                3,

              onboarding_completed_at:
                new Date().toISOString(),
            }
          : current
    );

    setGenerating(false);
  }

  async function copyText(
    label: string,
    value: string
  ) {
    try {
      await navigator.clipboard.writeText(
        value
      );

      setCopied(label);

      window.setTimeout(
        () => {
          setCopied("");
        },
        2000
      );
    } catch {
      setError(
        "Unable to copy to clipboard."
      );
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Preparing facility confirmation...
          </p>
        </div>
      </main>
    );
  }

  if (!facility) {
    return null;
  }

  const onboardingComplete =
    Boolean(
      facility.onboarding_completed_at
    );

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      {/* HEADER */}

      <header className="border-b border-[#dfe9e5] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/facility/readiness";
            }}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#087f6b] text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </div>

            <div className="text-left">
              <h1 className="text-xl font-bold text-[#10233c]">
                SurgiCare
              </h1>

              <p className="text-xs font-semibold text-[#087f6b]">
                Facility Onboarding
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/dashboard";
            }}
            className="rounded-xl border border-[#dfe9e5] bg-white px-4 py-2 text-sm font-semibold text-[#52635d]"
          >
            Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        {/* HERO */}

        <section className="overflow-hidden rounded-3xl bg-[#087f6b]">
          <div className="relative px-6 py-8 md:px-10 md:py-10">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />

            <div className="relative z-10">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                Step 3 of 3
              </span>

              <h2 className="mt-4 text-3xl font-bold text-white">
                Facility Confirmation
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
                Complete onboarding and generate secure facility
                access credentials for patient booking.
              </p>
            </div>
          </div>
        </section>

        {/* PROGRESS */}

        <section className="mt-6 rounded-2xl border border-[#dfe9e5] bg-white p-5">
          <div className="grid grid-cols-3 gap-3">
            <ProgressStep
              number="1"
              title="Verification"
              complete
            />

            <ProgressStep
              number="2"
              title="Readiness"
              complete
            />

            <ProgressStep
              number="3"
              title="Confirmation"
              active={!onboardingComplete}
              complete={onboardingComplete}
            />
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* FACILITY SUMMARY */}

        <section className="mt-6 rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
          <p className="text-sm font-semibold text-[#087f6b]">
            Facility summary
          </p>

          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-[#10233c]">
                {facility.name}
              </h3>

              <p className="mt-2 text-sm text-[#65756f]">
                {[
                  facility.district,
                  facility.region,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>

              {facility.gps_address && (
                <p className="mt-1 text-xs text-[#7a8984]">
                  GPS:{" "}
                  {facility.gps_address}
                </p>
              )}
            </div>

            <StatusBadge
              status={
                facility.verification_status
              }
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <SummaryItem
              label="Facility type"
              value={
                facility.facility_type ||
                "Not provided"
              }
            />

            <SummaryItem
              label="Onboarding"
              value={
                onboardingComplete
                  ? "Completed"
                  : "Ready to complete"
              }
            />

            <SummaryItem
              label="Verification"
              value={
                facility.verification_status ===
                "approved"
                  ? "Approved"
                  : facility.verification_status ===
                    "rejected"
                  ? "Rejected"
                  : "Coordinator review pending"
              }
            />
          </div>
        </section>

        {/* FIRST-TIME CONFIRMATION */}

        {!generatedAccess &&
          !onboardingComplete && (
            <section className="mt-6 rounded-3xl border border-[#b9ded3] bg-[#eef9f5] p-6 md:p-8">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-[#087f6b]">
                  Final onboarding step
                </p>

                <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
                  Generate Facility Access
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#52635d]">
                  SurgiCare will generate a unique facility code
                  and a secure 4-digit access PIN. Clinicians will
                  use these credentials during patient booking.
                </p>

                <div className="mt-5 rounded-2xl bg-white p-5">
                  <p className="text-sm font-semibold text-[#10233c]">
                    Important
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#65756f]">
                    The PIN will only be shown after generation.
                    Keep it securely and share it only with
                    authorized facility staff.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={generating}
                  onClick={
                    generateAccess
                  }
                  className="mt-6 rounded-xl bg-[#087f6b] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#056554] disabled:opacity-60"
                >
                  {generating
                    ? "Generating secure access..."
                    : "Complete Onboarding & Generate Access"}
                </button>
              </div>
            </section>
          )}

        {/* GENERATED ACCESS */}

        {generatedAccess && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-[#87c9b7] bg-white">
            <div className="bg-[#087f6b] p-6 text-white md:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-xl">
                ✓
              </div>

              <h3 className="mt-4 text-2xl font-bold">
                Facility onboarding complete
              </h3>

              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50">
                Save these access credentials securely before
                leaving this page.
              </p>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid gap-5 md:grid-cols-2">
                <CredentialCard
                  label="Facility Code"
                  value={
                    generatedAccess.facility_code
                  }
                  copied={
                    copied ===
                    "Facility Code"
                  }
                  onCopy={() =>
                    copyText(
                      "Facility Code",
                      generatedAccess.facility_code
                    )
                  }
                />

                <CredentialCard
                  label="4-digit Facility PIN"
                  value={
                    generatedAccess.access_pin
                  }
                  pin
                  copied={
                    copied ===
                    "PIN"
                  }
                  onCopy={() =>
                    copyText(
                      "PIN",
                      generatedAccess.access_pin
                    )
                  }
                />
              </div>

              <div className="mt-6 rounded-2xl border border-[#f1dfae] bg-[#fff9e8] p-5">
                <p className="font-semibold text-[#7f6200]">
                  Save the PIN now
                </p>

                <p className="mt-2 text-sm leading-6 text-[#826f32]">
                  For security, SurgiCare stores a protected hash
                  rather than the original PIN. If the PIN is lost,
                  you will need to generate a new one.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      "/dashboard";
                  }}
                  className="rounded-xl bg-[#087f6b] px-6 py-3.5 text-sm font-semibold text-white"
                >
                  Go to Facility Dashboard →
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      "/patients";
                  }}
                  className="rounded-xl border border-[#dfe9e5] bg-white px-6 py-3.5 text-sm font-semibold text-[#52635d]"
                >
                  Register Patient
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ALREADY COMPLETED */}

        {!generatedAccess &&
          onboardingComplete && (
            <section className="mt-6 rounded-3xl border border-[#b9ded3] bg-[#eef9f5] p-6 md:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-[#087f6b] shadow-sm">
                ✓
              </div>

              <h3 className="mt-4 text-2xl font-bold text-[#10233c]">
                Onboarding Complete
              </h3>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52635d]">
                This facility has completed the SurgiCare
                onboarding process.
              </p>

              {facility.facility_code && (
                <div className="mt-5 rounded-2xl bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
                    Facility Code
                  </p>

                  <p className="mt-2 text-2xl font-bold tracking-wider text-[#10233c]">
                    {facility.facility_code}
                  </p>
                </div>
              )}

              <p className="mt-5 text-sm leading-6 text-[#65756f]">
                The original PIN is not displayed again for
                security. Generate a new PIN only if facility
                staff have lost the existing one.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={generating}
                  onClick={
                    generateAccess
                  }
                  className="rounded-xl border border-[#087f6b] bg-white px-5 py-3 text-sm font-semibold text-[#087f6b] disabled:opacity-60"
                >
                  {generating
                    ? "Generating..."
                    : "Generate New PIN"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      "/dashboard";
                  }}
                  className="rounded-xl bg-[#087f6b] px-5 py-3 text-sm font-semibold text-white"
                >
                  Return to Dashboard
                </button>
              </div>
            </section>
          )}

        {/* VERIFICATION INFO */}

        <section className="mt-6 rounded-2xl border border-[#dfe9e5] bg-white p-5">
          <p className="text-sm font-semibold text-[#10233c]">
            What happens next?
          </p>

          <p className="mt-2 text-sm leading-6 text-[#65756f]">
            Completing onboarding does not automatically verify
            the facility. A SurgiCare coordinator will review the
            submitted facility and operational information before
            changing its status to approved.
          </p>
        </section>
      </div>
    </main>
  );
}

function ProgressStep({
  number,
  title,
  active = false,
  complete = false,
}: {
  number: string;
  title: string;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
          complete
            ? "bg-[#e7f6f1] text-[#087f6b]"
            : active
            ? "bg-[#087f6b] text-white"
            : "bg-[#edf1ef] text-[#7a8984]"
        }`}
      >
        {complete
          ? "✓"
          : number}
      </div>

      <p
        className={`mt-2 text-xs font-semibold ${
          active || complete
            ? "text-[#087f6b]"
            : "text-[#7a8984]"
        }`}
      >
        {title}
      </p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#f8fbfa] p-4">
      <p className="text-xs text-[#7a8984]">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-[#10233c]">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let text =
    "Pending verification";

  let className =
    "bg-[#fff7df] text-[#946900]";

  if (status === "approved") {
    text = "Approved";

    className =
      "bg-[#e7f6f1] text-[#087f6b]";
  }

  if (status === "rejected") {
    text = "Rejected";

    className =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}
    >
      {text}
    </span>
  );
}

function CredentialCard({
  label,
  value,
  pin = false,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  pin?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#dfe9e5] bg-[#f8fbfa] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
        {label}
      </p>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p
          className={`font-bold text-[#10233c] ${
            pin
              ? "text-4xl tracking-[0.35em]"
              : "text-2xl tracking-wider"
          }`}
        >
          {value}
        </p>

        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-xl border border-[#dfe9e5] bg-white px-4 py-2 text-xs font-semibold text-[#52635d]"
        >
          {copied
            ? "Copied ✓"
            : "Copy"}
        </button>
      </div>
    </div>
  );
}