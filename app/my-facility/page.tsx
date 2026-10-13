"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Facility = {
  id: string;
  name: string;

  facility_type: string | null;

  district: string | null;
  region: string | null;

  gps_address: string | null;

  surgical_status: string | null;

  lead_clinician_name: string | null;

  phone: string | null;
  whatsapp: string | null;

  verification_status: string;

  facility_code: string | null;

  ophthalmologist_count: number;
  optometrist_count: number;
  ophthalmic_nurse_count: number;

  monthly_screening_volume: number;

  has_reliable_power: boolean;
  has_running_water: boolean;
  has_sterilization: boolean;
  has_theatre_space: boolean;
};

type Patient = {
  id: string;

  facility_id: string;

  full_name: string;

  nhis_membership_no: string | null;
  nhis_status: string;

  age: number;
  sex: string;

  phone_patient: string | null;

  community: string | null;
  district: string | null;

  preferred_language: string | null;

  diagnosis: string | null;
  affected_eye: string | null;

  visual_acuity_right: string | null;
  visual_acuity_left: string | null;

  surgical_readiness: string | null;

  booking_clinician_name: string | null;

  booking_status: string;

  operated_at: string | null;

  offline_created: boolean;

  created_at: string;
};

type PatientFilter =
  | "all"
  | "ready"
  | "cataract"
  | "pterygium"
  | "operated";

export default function MyFacilityPage() {
  const [facility, setFacility] =
    useState<Facility | null>(null);

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<PatientFilter>("all");

  const [updatingPatientId, setUpdatingPatientId] =
    useState<string | null>(null);

  useEffect(() => {
    loadFacilityDashboard();
  }, []);

  async function loadFacilityDashboard(
    silent = false
  ) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    const userId = session.user.id;

    // --------------------------------------------------------
    // FACILITY MEMBERSHIP
    // --------------------------------------------------------

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("facility_staff")
      .select("facility_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error(membershipError);

      setError(
        "Unable to load your facility membership."
      );

      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!membership) {
      window.location.href = "/facility";
      return;
    }

    const facilityId =
      membership.facility_id;

    // --------------------------------------------------------
    // FACILITY
    // --------------------------------------------------------

    const {
      data: facilityData,
      error: facilityError,
    } = await supabase
      .from("facilities")
      .select(
        `
        id,
        name,
        facility_type,
        district,
        region,
        gps_address,
        surgical_status,
        lead_clinician_name,
        phone,
        whatsapp,
        verification_status,
        facility_code,
        ophthalmologist_count,
        optometrist_count,
        ophthalmic_nurse_count,
        monthly_screening_volume,
        has_reliable_power,
        has_running_water,
        has_sterilization,
        has_theatre_space
        `
      )
      .eq("id", facilityId)
      .single();

    if (
      facilityError ||
      !facilityData
    ) {
      console.error(
        facilityError
      );

      setError(
        "Unable to load your facility."
      );

      setLoading(false);
      setRefreshing(false);
      return;
    }

    setFacility(facilityData);

    // --------------------------------------------------------
    // PATIENTS
    // --------------------------------------------------------

    const {
      data: patientData,
      error: patientError,
    } = await supabase
      .from("patients")
      .select(
        `
        id,
        facility_id,
        full_name,
        nhis_membership_no,
        nhis_status,
        age,
        sex,
        phone_patient,
        community,
        district,
        preferred_language,
        diagnosis,
        affected_eye,
        visual_acuity_right,
        visual_acuity_left,
        surgical_readiness,
        booking_clinician_name,
        booking_status,
        operated_at,
        offline_created,
        created_at
        `
      )
      .eq(
        "facility_id",
        facilityId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (patientError) {
      console.error(
        patientError
      );

      setError(
        "Unable to load facility patients."
      );

      setLoading(false);
      setRefreshing(false);
      return;
    }

    setPatients(
      patientData || []
    );

    setLoading(false);
    setRefreshing(false);
  }

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const stats = useMemo(() => {
    const activePatients =
      patients.filter(
        (patient) =>
          patient.booking_status !==
          "removed"
      );

    const total =
      activePatients.length;

    const male =
      activePatients.filter(
        (patient) =>
          patient.sex === "M"
      ).length;

    const female =
      activePatients.filter(
        (patient) =>
          patient.sex === "F"
      ).length;

    const cataract =
      activePatients.filter(
        (patient) =>
          patient.diagnosis ===
          "cataract"
      ).length;

    const pterygium =
      activePatients.filter(
        (patient) =>
          patient.diagnosis ===
          "pterygium"
      ).length;

    const ready =
      activePatients.filter(
        (patient) =>
          patient.surgical_readiness ===
          "ready"
      ).length;

    const operated =
      activePatients.filter(
        (patient) =>
          patient.booking_status ===
          "operated"
      ).length;

    const averageAge =
      total > 0
        ? Math.round(
            activePatients.reduce(
              (sum, patient) =>
                sum + patient.age,
              0
            ) / total
          )
        : 0;

    return {
      total,
      male,
      female,
      cataract,
      pterygium,
      ready,
      operated,
      averageAge,
    };
  }, [patients]);

  // ==========================================================
  // FILTERING
  // ==========================================================

  const visiblePatients =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return patients.filter(
        (patient) => {
          if (
            patient.booking_status ===
            "removed"
          ) {
            return false;
          }

          if (
            filter === "ready" &&
            patient.surgical_readiness !==
              "ready"
          ) {
            return false;
          }

          if (
            filter === "cataract" &&
            patient.diagnosis !==
              "cataract"
          ) {
            return false;
          }

          if (
            filter === "pterygium" &&
            patient.diagnosis !==
              "pterygium"
          ) {
            return false;
          }

          if (
            filter === "operated" &&
            patient.booking_status !==
              "operated"
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable = [
            patient.full_name,
            patient.nhis_membership_no ||
              "",
            patient.phone_patient ||
              "",
            patient.community ||
              "",
            patient.district ||
              "",
            patient.booking_clinician_name ||
              "",
            patient.diagnosis ||
              "",
          ];

          return searchable.some(
            (value) =>
              value
                .toLowerCase()
                .includes(query)
          );
        }
      );
    }, [
      patients,
      search,
      filter,
    ]);

  // ==========================================================
  // MARK OPERATED
  // ==========================================================

  async function markOperated(
    patient: Patient
  ) {
    if (
      patient.booking_status ===
      "operated"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Mark ${patient.full_name} as operated?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    setUpdatingPatientId(
      patient.id
    );

    // ---------------------------------------
    // OPTIMISTIC UPDATE
    // ---------------------------------------

    const previousPatients =
      [...patients];

    setPatients(
      (current) =>
        current.map((item) =>
          item.id === patient.id
            ? {
                ...item,

                booking_status:
                  "operated",

                operated_at:
                  new Date().toISOString(),
              }
            : item
        )
    );

    const {
      error: updateError,
    } = await supabase.rpc(
      "mark_patient_operated",
      {
        p_patient_id:
          patient.id,
      }
    );

    if (updateError) {
      console.error(
        updateError
      );

      // rollback
      setPatients(
        previousPatients
      );

      setError(
        updateError.message
      );

      setUpdatingPatientId(
        null
      );

      return;
    }

    setMessage(
      `${patient.full_name} has been marked as operated.`
    );

    setUpdatingPatientId(
      null
    );
  }

  // ==========================================================
  // REMOVE FROM POOL
  // ==========================================================

  async function removePatient(
    patient: Patient
  ) {
    const confirmed =
      window.confirm(
        `Remove ${patient.full_name} from the outreach pool?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    setUpdatingPatientId(
      patient.id
    );

    // optimistic remove

    const previousPatients =
      [...patients];

    setPatients(
      (current) =>
        current.map((item) =>
          item.id === patient.id
            ? {
                ...item,

                booking_status:
                  "removed",
              }
            : item
        )
    );

    const {
      error: removeError,
    } = await supabase.rpc(
      "remove_patient_from_pool",
      {
        p_patient_id:
          patient.id,
      }
    );

    if (removeError) {
      console.error(
        removeError
      );

      setPatients(
        previousPatients
      );

      setError(
        removeError.message
      );

      setUpdatingPatientId(
        null
      );

      return;
    }

    setMessage(
      `${patient.full_name} was removed from the outreach pool.`
    );

    setUpdatingPatientId(
      null
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Loading your facility...
          </p>
        </div>
      </main>
    );
  }

  if (!facility) {
    return null;
  }

  let verificationText =
    "Pending verification";

  let verificationClass =
    "bg-[#fff7df] text-[#946900]";

  if (
    facility.verification_status ===
    "approved"
  ) {
    verificationText =
      "Verified";

    verificationClass =
      "bg-[#e7f6f1] text-[#087f6b]";
  }

  if (
    facility.verification_status ===
    "rejected"
  ) {
    verificationText =
      "Rejected";

    verificationClass =
      "bg-red-50 text-red-700";
  }

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-[#dfe9e5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/dashboard";
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
                My Facility
              </p>
            </div>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={() =>
                loadFacilityDashboard(
                  true
                )
              }
              className="rounded-xl border border-[#dfe9e5] bg-white px-4 py-2 text-sm font-semibold text-[#52635d] disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/dashboard";
              }}
              className="hidden rounded-xl border border-[#dfe9e5] bg-white px-4 py-2 text-sm font-semibold text-[#52635d] sm:block"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {/* HERO */}

        <section className="overflow-hidden rounded-3xl bg-[#087f6b]">
          <div className="relative px-6 py-9 md:px-10 md:py-11">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />

            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  Facility Workspace
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${verificationClass}`}
                >
                  {verificationText}
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                {facility.name}
              </h2>

              <p className="mt-3 text-sm text-emerald-50">
                {[
                  facility.district,
                  facility.region,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>

              {facility.gps_address && (
                <p className="mt-1 text-xs text-emerald-100">
                  GPS:{" "}
                  {facility.gps_address}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* FEEDBACK */}

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

        {/* FACILITY DETAILS */}

        <section className="mt-6 rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#087f6b]">
                Facility information
              </p>

              <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
                Operational profile
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    "/facility";
                }}
                className="rounded-xl border border-[#dfe9e5] bg-white px-5 py-3 text-sm font-semibold text-[#52635d]"
              >
                Edit Facility
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    "/book-patient";
                }}
                className="rounded-xl bg-[#087f6b] px-5 py-3 text-sm font-semibold text-white"
              >
                + Add Patient
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Facility type"
              value={
                facility.facility_type ||
                "Not provided"
              }
            />

            <Info
              label="Lead clinician"
              value={
                facility.lead_clinician_name ||
                "Not provided"
              }
            />

            <Info
              label="Phone"
              value={
                facility.phone ||
                "Not provided"
              }
            />

            <Info
              label="Facility code"
              value={
                facility.facility_code ||
                "Not generated"
              }
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CapabilityCard
              title="Power"
              active={
                facility.has_reliable_power
              }
            />

            <CapabilityCard
              title="Running water"
              active={
                facility.has_running_water
              }
            />

            <CapabilityCard
              title="Sterilization"
              active={
                facility.has_sterilization
              }
            />

            <CapabilityCard
              title="Theatre space"
              active={
                facility.has_theatre_space
              }
            />
          </div>
        </section>

        {/* STATS */}

        <section className="mt-6">
          <p className="text-sm font-semibold text-[#087f6b]">
            Patient pool
          </p>

          <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
            Clinical overview
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <StatCard
              label="Total"
              value={
                stats.total
              }
            />

            <StatCard
              label="Ready"
              value={
                stats.ready
              }
              green
            />

            <StatCard
              label="Operated"
              value={
                stats.operated
              }
            />

            <StatCard
              label="Cataract"
              value={
                stats.cataract
              }
            />

            <StatCard
              label="Pterygium"
              value={
                stats.pterygium
              }
            />

            <StatCard
              label="Male"
              value={
                stats.male
              }
            />

            <StatCard
              label="Female"
              value={
                stats.female
              }
            />

            <StatCard
              label="Avg age"
              value={
                stats.averageAge
              }
            />
          </div>
        </section>

        {/* MISSION NOTICE PLACEHOLDER */}

        <section className="mt-6 rounded-2xl border border-[#dfe9e5] bg-white p-5">
          <p className="text-sm font-semibold text-[#10233c]">
            Mission notifications
          </p>

          <p className="mt-2 text-sm leading-6 text-[#65756f]">
            No mission notifications yet. Once SurgiCare Missions
            is activated, selected outreach missions will appear here
            automatically.
          </p>
        </section>

        {/* PATIENT ROSTER */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#dfe9e5] bg-white">
          <div className="border-b border-[#e5eeea] p-6 md:p-8">
            <p className="text-sm font-semibold text-[#087f6b]">
              Patient roster
            </p>

            <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
              Outreach patients
            </h3>

            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search patient, NHIS, clinician, community..."
                className={inputClass}
              />

              <div className="flex flex-wrap gap-2">
                <FilterButton
                  label="All"
                  active={
                    filter ===
                    "all"
                  }
                  onClick={() =>
                    setFilter(
                      "all"
                    )
                  }
                />

                <FilterButton
                  label="Ready"
                  active={
                    filter ===
                    "ready"
                  }
                  onClick={() =>
                    setFilter(
                      "ready"
                    )
                  }
                />

                <FilterButton
                  label="Cataract"
                  active={
                    filter ===
                    "cataract"
                  }
                  onClick={() =>
                    setFilter(
                      "cataract"
                    )
                  }
                />

                <FilterButton
                  label="Pterygium"
                  active={
                    filter ===
                    "pterygium"
                  }
                  onClick={() =>
                    setFilter(
                      "pterygium"
                    )
                  }
                />

                <FilterButton
                  label="Operated"
                  active={
                    filter ===
                    "operated"
                  }
                  onClick={() =>
                    setFilter(
                      "operated"
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {visiblePatients.length ===
            0 ? (
              <div className="py-12 text-center">
                <h4 className="text-lg font-bold text-[#10233c]">
                  No patients found
                </h4>

                <p className="mt-2 text-sm text-[#65756f]">
                  Add your first patient or change the current filter.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      "/book-patient";
                  }}
                  className="mt-5 rounded-xl bg-[#087f6b] px-5 py-3 text-sm font-semibold text-white"
                >
                  + Book Patient
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {visiblePatients.map(
                  (patient) => (
                    <PatientCard
                      key={
                        patient.id
                      }
                      patient={
                        patient
                      }
                      updating={
                        updatingPatientId ===
                        patient.id
                      }
                      onMarkOperated={() =>
                        markOperated(
                          patient
                        )
                      }
                      onRemove={() =>
                        removePatient(
                          patient
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#dfe9e5] bg-white px-4 py-3.5 text-sm text-[#10231f] outline-none transition placeholder:text-slate-400 focus:border-[#087f6b] focus:ring-4 focus:ring-[#087f6b]/10";

function PatientCard({
  patient,
  updating,
  onMarkOperated,
  onRemove,
}: {
  patient: Patient;
  updating: boolean;
  onMarkOperated: () => void;
  onRemove: () => void;
}) {
  const ready =
    patient.surgical_readiness ===
    "ready";

  const operated =
    patient.booking_status ===
    "operated";

  return (
    <article className="rounded-2xl border border-[#dfe9e5] bg-[#fbfdfc] p-5 md:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="text-lg font-bold text-[#10233c]">
              {patient.full_name}
            </h4>

            {ready && (
              <span className="rounded-full bg-[#e7f6f1] px-3 py-1 text-xs font-semibold text-[#087f6b]">
                Ready Now
              </span>
            )}

            {operated && (
              <span className="rounded-full bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#3569a8]">
                Operated
              </span>
            )}

            {patient.offline_created && (
              <span className="rounded-full bg-[#f0f3f2] px-3 py-1 text-xs font-semibold text-[#65756f]">
                Synced offline
              </span>
            )}
          </div>

          <p className="mt-2 text-sm font-semibold capitalize text-[#087f6b]">
            {patient.diagnosis ||
              "Diagnosis not recorded"}

            {patient.affected_eye
              ? ` · ${patient.affected_eye} eye`
              : ""}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Age / Sex"
              value={`${patient.age} · ${
                patient.sex === "M"
                  ? "Male"
                  : patient.sex === "F"
                  ? "Female"
                  : patient.sex
              }`}
            />

            <Info
              label="NHIS"
              value={
                patient.nhis_membership_no
                  ? `${patient.nhis_membership_no} (${patient.nhis_status})`
                  : "Not provided"
              }
            />

            <Info
              label="Visual acuity"
              value={`RE ${
                patient.visual_acuity_right ||
                "—"
              } · LE ${
                patient.visual_acuity_left ||
                "—"
              }`}
            />

            <Info
              label="Booked by"
              value={
                patient.booking_clinician_name ||
                "Not recorded"
              }
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:w-44 xl:flex-col">
          {!operated && (
            <button
              type="button"
              disabled={
                updating
              }
              onClick={
                onMarkOperated
              }
              className="flex-1 rounded-xl bg-[#087f6b] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {updating
                ? "Updating..."
                : "Mark Operated"}
            </button>
          )}

          <button
            type="button"
            disabled={
              updating
            }
            onClick={
              onRemove
            }
            className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 disabled:opacity-50"
          >
            Remove from Pool
          </button>
        </div>
      </div>
    </article>
  );
}

function StatCard({
  label,
  value,
  green = false,
}: {
  label: string;
  value: number;
  green?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        green
          ? "border-[#b9ded3] bg-[#eef9f5]"
          : "border-[#dfe9e5] bg-white"
      }`}
    >
      <p className="text-xs text-[#65756f]">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          green
            ? "text-[#087f6b]"
            : "text-[#10233c]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CapabilityCard({
  title,
  active,
}: {
  title: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        active
          ? "border-[#b9ded3] bg-[#eef9f5]"
          : "border-[#e2e9e6] bg-[#f6f8f7]"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          active
            ? "text-[#087f6b]"
            : "text-[#7a8984]"
        }`}
      >
        {active ? "✓ " : "— "}
        {title}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-[#7a8984]">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-[#10233c]">
        {value}
      </p>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-[#087f6b] text-white"
          : "border border-[#dfe9e5] bg-white text-[#52635d]"
      }`}
    >
      {label}
    </button>
  );
}