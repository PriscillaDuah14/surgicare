"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type ReadinessForm = {
  ophthalmologist_count: number;
  optometrist_count: number;
  ophthalmic_nurse_count: number;

  monthly_screening_volume: number;

  has_reliable_power: boolean;
  has_running_water: boolean;
  has_sterilization: boolean;
  has_theatre_space: boolean;

  cataract_surgery_capable: boolean;
  pterygium_surgery_capable: boolean;

  readiness_notes: string;
};

const initialForm: ReadinessForm = {
  ophthalmologist_count: 0,
  optometrist_count: 0,
  ophthalmic_nurse_count: 0,

  monthly_screening_volume: 0,

  has_reliable_power: false,
  has_running_water: false,
  has_sterilization: false,
  has_theatre_space: false,

  cataract_surgery_capable: false,
  pterygium_surgery_capable: false,

  readiness_notes: "",
};

export default function FacilityReadinessPage() {
  const [form, setForm] = useState<ReadinessForm>(initialForm);

  const [facilityName, setFacilityName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    loadReadiness();
  }, []);

  async function loadReadiness() {
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

    const { data: facility, error: facilityError } =
      await supabase
        .from("facilities")
        .select(
          `
          name,
          ophthalmologist_count,
          optometrist_count,
          ophthalmic_nurse_count,
          monthly_screening_volume,
          has_reliable_power,
          has_running_water,
          has_sterilization,
          has_theatre_space,
          cataract_surgery_capable,
          pterygium_surgery_capable,
          readiness_notes
          `
        )
        .eq("id", membership.facility_id)
        .single();

    if (facilityError || !facility) {
      console.error(facilityError);

      setError(
        "Unable to load facility readiness details."
      );

      setLoading(false);
      return;
    }

    setFacilityName(
      facility.name || ""
    );

    setForm({
      ophthalmologist_count:
        facility.ophthalmologist_count ?? 0,

      optometrist_count:
        facility.optometrist_count ?? 0,

      ophthalmic_nurse_count:
        facility.ophthalmic_nurse_count ?? 0,

      monthly_screening_volume:
        facility.monthly_screening_volume ?? 0,

      has_reliable_power:
        facility.has_reliable_power ?? false,

      has_running_water:
        facility.has_running_water ?? false,

      has_sterilization:
        facility.has_sterilization ?? false,

      has_theatre_space:
        facility.has_theatre_space ?? false,

      cataract_surgery_capable:
        facility.cataract_surgery_capable ?? false,

      pterygium_surgery_capable:
        facility.pterygium_surgery_capable ?? false,

      readiness_notes:
        facility.readiness_notes || "",
    });

    setLoading(false);
  }

  function updateNumber(
    field:
      | "ophthalmologist_count"
      | "optometrist_count"
      | "ophthalmic_nurse_count"
      | "monthly_screening_volume",
    value: string
  ) {
    const parsed = Number(value);

    setForm((current) => ({
      ...current,

      [field]:
        Number.isNaN(parsed)
          ? 0
          : Math.max(0, parsed),
    }));
  }

  function updateBoolean(
    field:
      | "has_reliable_power"
      | "has_running_water"
      | "has_sterilization"
      | "has_theatre_space"
      | "cataract_surgery_capable"
      | "pterygium_surgery_capable",
    value: boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveReadiness(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const { data, error } =
      await supabase.rpc(
        "save_facility_readiness",
        {
          p_ophthalmologist_count:
            form.ophthalmologist_count,

          p_optometrist_count:
            form.optometrist_count,

          p_ophthalmic_nurse_count:
            form.ophthalmic_nurse_count,

          p_monthly_screening_volume:
            form.monthly_screening_volume,

          p_has_reliable_power:
            form.has_reliable_power,

          p_has_running_water:
            form.has_running_water,

          p_has_sterilization:
            form.has_sterilization,

          p_has_theatre_space:
            form.has_theatre_space,

          p_cataract_surgery_capable:
            form.cataract_surgery_capable,

          p_pterygium_surgery_capable:
            form.pterygium_surgery_capable,

          p_readiness_notes:
            form.readiness_notes.trim(),
        }
      );

    if (error) {
      console.error(
        "Readiness save error:",
        error
      );

      setError(error.message);
      setSaving(false);
      return;
    }

    if (!data || data.length === 0) {
      setError(
        "SurgiCare could not confirm the readiness update."
      );

      setSaving(false);
      return;
    }

    const saved =
      data[0];

    if (
      Number(saved.onboarding_step) < 2 ||
      !saved.readiness_completed_at
    ) {
      setError(
        "Step 2 was not marked complete. Please try again."
      );

      setSaving(false);
      return;
    }

    // Successful save → go directly to Step 3

    window.location.href =
      "/facility/confirmation";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Loading operational readiness...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      {/* HEADER */}

      <header className="border-b border-[#dfe9e5] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/facility";
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
                Step 2 of 3
              </span>

              <h2 className="mt-4 text-3xl font-bold text-white">
                Operational Readiness
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
                Capture staffing, screening capacity,
                infrastructure and surgical capability for{" "}
                {facilityName || "your facility"}.
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
              active
            />

            <ProgressStep
              number="3"
              title="Confirmation"
            />
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">
              Unable to continue
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>
        )}

        <form
          onSubmit={saveReadiness}
          className="mt-6 overflow-hidden rounded-3xl border border-[#dfe9e5] bg-white"
        >
          {/* STAFF */}

          <FormSection
            title="Clinical staffing"
            description="Enter the current number of eye-care staff available at this facility."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <NumberField
                label="Ophthalmologists"
                value={
                  form.ophthalmologist_count
                }
                onChange={(value) =>
                  updateNumber(
                    "ophthalmologist_count",
                    value
                  )
                }
              />

              <NumberField
                label="Optometrists"
                value={
                  form.optometrist_count
                }
                onChange={(value) =>
                  updateNumber(
                    "optometrist_count",
                    value
                  )
                }
              />

              <NumberField
                label="Ophthalmic nurses"
                value={
                  form.ophthalmic_nurse_count
                }
                onChange={(value) =>
                  updateNumber(
                    "ophthalmic_nurse_count",
                    value
                  )
                }
              />
            </div>
          </FormSection>

          <Divider />

          {/* SCREENING */}

          <FormSection
            title="Screening volume"
            description="Estimate how many eye-care patients are screened in a typical month."
          >
            <div className="max-w-md">
              <NumberField
                label="Average monthly screening volume"
                value={
                  form.monthly_screening_volume
                }
                onChange={(value) =>
                  updateNumber(
                    "monthly_screening_volume",
                    value
                  )
                }
              />
            </div>
          </FormSection>

          <Divider />

          {/* INFRASTRUCTURE */}

          <FormSection
            title="Infrastructure"
            description="Indicate which essential services and spaces are reliably available."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleCard
                title="Reliable power"
                description="The facility has dependable electricity or backup power."
                checked={
                  form.has_reliable_power
                }
                onChange={(value) =>
                  updateBoolean(
                    "has_reliable_power",
                    value
                  )
                }
              />

              <ToggleCard
                title="Running water"
                description="Reliable clean running water is available."
                checked={
                  form.has_running_water
                }
                onChange={(value) =>
                  updateBoolean(
                    "has_running_water",
                    value
                  )
                }
              />

              <ToggleCard
                title="Sterilization capability"
                description="Equipment or systems for safe instrument sterilization are available."
                checked={
                  form.has_sterilization
                }
                onChange={(value) =>
                  updateBoolean(
                    "has_sterilization",
                    value
                  )
                }
              />

              <ToggleCard
                title="Theatre space"
                description="Suitable procedure or theatre space is available."
                checked={
                  form.has_theatre_space
                }
                onChange={(value) =>
                  updateBoolean(
                    "has_theatre_space",
                    value
                  )
                }
              />
            </div>
          </FormSection>

          <Divider />

          {/* SURGICAL CAPABILITY */}

          <FormSection
            title="Surgical capability"
            description="Indicate which procedures the facility can currently support."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleCard
                title="Cataract surgery capable"
                description="The facility can support cataract surgical procedures."
                checked={
                  form.cataract_surgery_capable
                }
                onChange={(value) =>
                  updateBoolean(
                    "cataract_surgery_capable",
                    value
                  )
                }
              />

              <ToggleCard
                title="Pterygium surgery capable"
                description="The facility can support pterygium surgical procedures."
                checked={
                  form.pterygium_surgery_capable
                }
                onChange={(value) =>
                  updateBoolean(
                    "pterygium_surgery_capable",
                    value
                  )
                }
              />
            </div>
          </FormSection>

          <Divider />

          {/* NOTES */}

          <FormSection
            title="Operational notes"
            description="Add any limitations, equipment gaps or additional context."
          >
            <textarea
              value={
                form.readiness_notes
              }
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  readiness_notes:
                    e.target.value,
                }))
              }
              rows={5}
              placeholder="Example: Theatre available two days per week. Backup generator available. Additional cataract instruments required..."
              className={`${inputClass} resize-none`}
            />
          </FormSection>

          {/* SUMMARY */}

          <div className="border-t border-[#e5eeea] bg-[#f8fbfa] p-6 md:p-8">
            <p className="text-sm font-semibold text-[#087f6b]">
              Readiness snapshot
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Clinical staff"
                value={String(
                  form.ophthalmologist_count +
                    form.optometrist_count +
                    form.ophthalmic_nurse_count
                )}
              />

              <SummaryCard
                label="Monthly screenings"
                value={String(
                  form.monthly_screening_volume
                )}
              />

              <SummaryCard
                label="Infrastructure"
                value={`${[
                  form.has_reliable_power,
                  form.has_running_water,
                  form.has_sterilization,
                  form.has_theatre_space,
                ].filter(Boolean).length}/4`}
              />

              <SummaryCard
                label="Surgery types"
                value={`${[
                  form.cataract_surgery_capable,
                  form.pterygium_surgery_capable,
                ].filter(Boolean).length}/2`}
              />
            </div>
          </div>

          {/* ACTIONS */}

          <div className="flex flex-col gap-3 border-t border-[#e5eeea] p-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/facility";
              }}
              className="rounded-xl border border-[#dfe9e5] bg-white px-5 py-3 text-sm font-semibold text-[#52635d]"
            >
              ← Back to Verification
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#087f6b] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#056554] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : "Continue to Confirmation →"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#dfe9e5] bg-white px-4 py-3.5 text-sm text-[#10231f] outline-none transition placeholder:text-slate-400 focus:border-[#087f6b] focus:ring-4 focus:ring-[#087f6b]/10";

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-6 md:p-8">
      <h3 className="text-xl font-bold text-[#10233c]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#65756f]">
        {description}
      </p>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#10233c]">
        {label}
      </label>

      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className={inputClass}
      />
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(!checked)
      }
      className={`flex w-full items-center justify-between gap-5 rounded-2xl border p-5 text-left transition ${
        checked
          ? "border-[#87c9b7] bg-[#edf8f4]"
          : "border-[#dfe9e5] bg-white"
      }`}
    >
      <div>
        <p className="font-semibold text-[#10233c]">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-[#65756f]">
          {description}
        </p>
      </div>

      <div
        className={`relative h-7 w-12 shrink-0 rounded-full ${
          checked
            ? "bg-[#087f6b]"
            : "bg-[#d6e2de]"
        }`}
      >
        <div
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked
              ? "left-6"
              : "left-1"
          }`}
        />
      </div>
    </button>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs text-[#7a8984]">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-[#10233c]">
        {value}
      </p>
    </div>
  );
}

function Divider() {
  return (
    <div className="border-t border-[#e5eeea]" />
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
          active
            ? "bg-[#087f6b] text-white"
            : complete
            ? "bg-[#e7f6f1] text-[#087f6b]"
            : "bg-[#edf1ef] text-[#7a8984]"
        }`}
      >
        {complete ? "✓" : number}
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