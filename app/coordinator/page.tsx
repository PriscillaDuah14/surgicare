"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Profile = {
  full_name: string | null;
  role: string;
};

type Facility = {
  id: string;
  name: string;
  facility_type: string;
  district: string | null;
  region: string | null;
  gps_address: string | null;
  lead_clinician_name: string | null;
  phone: string | null;
  verification_status: string;
  created_at: string;
};

type Patient = {
  id: string;
  facility_id: string;
};

type ClinicalRecord = {
  patient_id: string;
  surgical_readiness: string;
};

type FacilityWithStats = Facility & {
  patient_count: number;
  ready_count: number;
};

export default function CoordinatorDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [facilities, setFacilities] = useState<
    FacilityWithStats[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    const userId = session.user.id;

    setCurrentUserId(userId);

    // ---------------------------------------
    // PROFILE + ROLE CHECK
    // ---------------------------------------

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", userId)
      .single();

    if (profileError || !profileData) {
      console.error(profileError);

      setError(
        "Unable to load your SurgiCare profile."
      );

      setLoading(false);
      return;
    }

    setProfile(profileData);

    if (
      profileData.role !== "coordinator" &&
      profileData.role !== "admin"
    ) {
      window.location.href = "/dashboard";
      return;
    }

    // ---------------------------------------
    // FACILITIES
    // ---------------------------------------

    const {
      data: facilityRows,
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
        lead_clinician_name,
        phone,
        verification_status,
        created_at
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (facilityError) {
      console.error(facilityError);

      setError(
        "Unable to load SurgiCare facilities."
      );

      setLoading(false);
      return;
    }

    // ---------------------------------------
    // PATIENTS ACROSS ALL FACILITIES
    // ---------------------------------------

    const {
      data: patientRows,
      error: patientError,
    } = await supabase
      .from("patients")
      .select("id, facility_id");

    if (patientError) {
      console.error(patientError);

      setError(
        "Unable to load SurgiCare patients."
      );

      setLoading(false);
      return;
    }

    const patients: Patient[] =
      patientRows || [];

    // ---------------------------------------
    // CLINICAL RECORDS
    // ---------------------------------------

    let clinicalRows: ClinicalRecord[] = [];

    if (patients.length > 0) {
      const patientIds = patients.map(
        (patient) => patient.id
      );

      const {
        data,
        error: clinicalError,
      } = await supabase
        .from("patient_clinical_records")
        .select(
          "patient_id, surgical_readiness"
        )
        .in("patient_id", patientIds);

      if (clinicalError) {
        console.error(clinicalError);

        setError(
          "Unable to load patient readiness information."
        );

        setLoading(false);
        return;
      }

      clinicalRows = data || [];
    }

    // ---------------------------------------
    // BUILD FACILITY STATS
    // ---------------------------------------

    const patientFacilityMap =
      new Map<string, string>();

    for (const patient of patients) {
      patientFacilityMap.set(
        patient.id,
        patient.facility_id
      );
    }

    const totalByFacility =
      new Map<string, number>();

    const readyByFacility =
      new Map<string, number>();

    for (const patient of patients) {
      totalByFacility.set(
        patient.facility_id,
        (totalByFacility.get(
          patient.facility_id
        ) || 0) + 1
      );
    }

    for (const record of clinicalRows) {
      if (
        record.surgical_readiness !==
        "Ready Now"
      ) {
        continue;
      }

      const facilityId =
        patientFacilityMap.get(
          record.patient_id
        );

      if (!facilityId) {
        continue;
      }

      readyByFacility.set(
        facilityId,
        (readyByFacility.get(
          facilityId
        ) || 0) + 1
      );
    }

    const combined: FacilityWithStats[] =
      (facilityRows || []).map(
        (facility) => ({
          ...facility,

          patient_count:
            totalByFacility.get(
              facility.id
            ) || 0,

          ready_count:
            readyByFacility.get(
              facility.id
            ) || 0,
        })
      );

    setFacilities(combined);
    setLoading(false);
  }

  const summary = useMemo(() => {
    const totalFacilities =
      facilities.length;

    const pending = facilities.filter(
      (facility) =>
        facility.verification_status ===
        "pending"
    ).length;

    const approved = facilities.filter(
      (facility) =>
        facility.verification_status ===
        "approved"
    ).length;

    const rejected = facilities.filter(
      (facility) =>
        facility.verification_status ===
        "rejected"
    ).length;

    const totalPatients =
      facilities.reduce(
        (total, facility) =>
          total +
          facility.patient_count,
        0
      );

    const readyPatients =
      facilities.reduce(
        (total, facility) =>
          total +
          facility.ready_count,
        0
      );

    return {
      totalFacilities,
      pending,
      approved,
      rejected,
      totalPatients,
      readyPatients,
    };
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    let result = [...facilities];

    if (statusFilter !== "all") {
      result = result.filter(
        (facility) =>
          facility.verification_status ===
          statusFilter
      );
    }

    const query =
      search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (facility) => {
          const searchable = [
            facility.name,
            facility.facility_type,
            facility.district || "",
            facility.region || "",
            facility.gps_address || "",
            facility.lead_clinician_name ||
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
    }

    return result;
  }, [
    facilities,
    statusFilter,
    search,
  ]);

  async function updateFacilityStatus(
    facility: FacilityWithStats,
    newStatus:
      | "approved"
      | "rejected"
  ) {
    if (!currentUserId) {
      setError(
        "Your session could not be verified."
      );

      return;
    }

    const actionLabel =
      newStatus === "approved"
        ? "approve"
        : "reject";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${actionLabel} ${facility.name}?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setUpdatingId(facility.id);

    const {
      error: updateError,
    } = await supabase
      .from("facilities")
      .update({
        verification_status:
          newStatus,
      })
      .eq("id", facility.id);

    if (updateError) {
      console.error(updateError);

      setError(
        `Unable to ${actionLabel} this facility.`
      );

      setUpdatingId(null);
      return;
    }

    const {
      error: auditError,
    } = await supabase
      .from("audit_logs")
      .insert({
        user_id: currentUserId,

        action:
          newStatus === "approved"
            ? "facility_approved"
            : "facility_rejected",

        entity_type: "facility",

        entity_id: facility.id,

        details: {
          facility_name:
            facility.name,

          previous_status:
            facility.verification_status,

          new_status: newStatus,
        },
      });

    if (auditError) {
      console.error(
        "Audit log error:",
        auditError
      );
    }

    setFacilities((current) =>
      current.map((item) =>
        item.id === facility.id
          ? {
              ...item,

              verification_status:
                newStatus,
            }
          : item
      )
    );

    setUpdatingId(null);
  }

  async function logout() {
    await supabase.auth.signOut();

    window.location.href =
      "/login";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Loading Control Tower...
          </p>
        </div>
      </main>
    );
  }

  const firstName =
    profile?.full_name
      ?.trim()
      .split(" ")[0] ||
    "Coordinator";

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-[#dfe9e5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
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

            <div>
              <h1 className="text-xl font-bold text-[#10233c]">
                SurgiCare
              </h1>

              <p className="text-xs font-medium text-[#087f6b]">
                Control Tower
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[#10233c]">
                {profile?.full_name ||
                  "Coordinator"}
              </p>

              <p className="text-xs capitalize text-[#65756f]">
                {profile?.role}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/dashboard";
              }}
              className="flex items-center gap-2 rounded-xl border border-[#b9ded3] bg-[#eef9f5] px-4 py-2 text-sm font-semibold text-[#087f6b] transition hover:border-[#87c9b7] hover:bg-[#e6f6f0]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5 10v10h14V10" />
                <path d="M9 20v-6h6v6" />
              </svg>

              <span className="hidden sm:inline">
                Dashboard
              </span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-[#dfe9e5] bg-white px-4 py-2 text-sm font-semibold text-[#52635d] transition hover:bg-[#f6faf8]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {/* HERO */}

        <section className="overflow-hidden rounded-3xl bg-[#087f6b]">
          <div className="relative px-6 py-9 md:px-10 md:py-11">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />

            <div className="absolute -bottom-28 right-48 h-64 w-64 rounded-full bg-white/5" />

            <div className="relative z-10">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                Coordinator Workspace
              </span>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Welcome, {firstName}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 md:text-base">
                Monitor the SurgiCare network,
                review facilities and prepare
                patient populations for outreach
                clustering and mission planning.
              </p>
            </div>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* NETWORK OVERVIEW */}

        <section className="mt-8">
          <div>
            <p className="text-sm font-semibold text-[#087f6b]">
              Network overview
            </p>

            <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
              SurgiCare at a glance
            </h3>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Facilities"
              value={
                summary.totalFacilities
              }
            />

            <MetricCard
              label="Pending"
              value={summary.pending}
            />

            <MetricCard
              label="Approved"
              value={summary.approved}
            />

            <MetricCard
              label="Rejected"
              value={summary.rejected}
            />

            <MetricCard
              label="Patients"
              value={
                summary.totalPatients
              }
            />

            <MetricCard
              label="Ready now"
              value={
                summary.readyPatients
              }
              green
            />
          </div>
        </section>

        {/* CONTROL TOWER */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#dfe9e5] bg-white">
          <div className="flex flex-col gap-5 border-b border-[#e5eeea] p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <p className="text-sm font-semibold text-[#087f6b]">
                Control Tower
              </p>

              <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
                Facility network
              </h3>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#65756f]">
                Review facility readiness,
                verification status and patient
                volumes across the SurgiCare
                network.
              </p>
            </div>

            {/* CONTROL TOWER ACTIONS */}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    "/coordinator/recommendations";
                }}
                className="group rounded-2xl border border-[#b9ded3] bg-[#eef9f5] px-5 py-4 text-left transition hover:border-[#87c9b7] hover:bg-[#e6f6f0]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
                  Outreach intelligence
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm font-bold text-[#10233c]">
                    Recommendation Engine
                  </p>

                  <span className="text-[#087f6b] transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    "/missions";
                }}
                className="group rounded-2xl bg-[#10233c] px-5 py-4 text-left transition hover:bg-[#1b3655]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8c8c0]">
                  Mission operations
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <p className="text-sm font-bold text-white">
                    Mission Control
                  </p>

                  <span className="text-white transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* SEARCH AND FILTER */}

          <div className="border-b border-[#e5eeea] p-6 md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search facility, district, region or clinician..."
                className="w-full rounded-xl border border-[#dfe9e5] bg-white px-4 py-3.5 text-sm text-[#10231f] outline-none transition placeholder:text-slate-400 focus:border-[#087f6b] focus:ring-4 focus:ring-[#087f6b]/10 lg:max-w-md"
              />

              <div className="flex flex-wrap gap-2">
                <FilterButton
                  label="All"
                  active={
                    statusFilter ===
                    "all"
                  }
                  onClick={() =>
                    setStatusFilter(
                      "all"
                    )
                  }
                />

                <FilterButton
                  label="Pending"
                  active={
                    statusFilter ===
                    "pending"
                  }
                  onClick={() =>
                    setStatusFilter(
                      "pending"
                    )
                  }
                />

                <FilterButton
                  label="Approved"
                  active={
                    statusFilter ===
                    "approved"
                  }
                  onClick={() =>
                    setStatusFilter(
                      "approved"
                    )
                  }
                />

                <FilterButton
                  label="Rejected"
                  active={
                    statusFilter ===
                    "rejected"
                  }
                  onClick={() =>
                    setStatusFilter(
                      "rejected"
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* FACILITIES */}

          <div className="p-6 md:p-8">
            {filteredFacilities.length ===
            0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f6f1] text-[#087f6b]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 21h18" />

                    <path d="M5 21V7l7-4 7 4v14" />
                  </svg>
                </div>

                <h4 className="mt-4 text-lg font-bold text-[#10233c]">
                  No facilities found
                </h4>

                <p className="mt-2 text-sm text-[#65756f]">
                  Try changing the search or
                  status filter.
                </p>
              </div>
            ) : (
              <div className="grid gap-5">
                {filteredFacilities.map(
                  (facility) => (
                    <FacilityCard
                      key={
                        facility.id
                      }
                      facility={
                        facility
                      }
                      updating={
                        updatingId ===
                        facility.id
                      }
                      onApprove={() =>
                        updateFacilityStatus(
                          facility,
                          "approved"
                        )
                      }
                      onReject={() =>
                        updateFacilityStatus(
                          facility,
                          "rejected"
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* RECOMMENDATION ENGINE */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#b9ded3] bg-[#eef9f5]">
          <div className="flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#087f6b] shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 17 9 12l4 4 7-8" />

                    <path d="M14 8h6v6" />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#087f6b]">
                    AI-assisted outreach
                  </p>

                  <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
                    Outreach Recommendation
                    Engine
                  </h3>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#52635d]">
                Analyze approved facilities,
                patient demand and surgical
                readiness to generate proposed
                outreach clusters for coordinator
                review.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#52635d]">
                  Facility demand
                </span>

                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#52635d]">
                  Ready patients
                </span>

                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#52635d]">
                  Geographic grouping
                </span>

                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#52635d]">
                  Human-reviewed clusters
                </span>
              </div>
            </div>

            <div className="shrink-0 lg:w-64">
              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    "/coordinator/recommendations";
                }}
                className="w-full rounded-xl bg-[#087f6b] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#056554]"
              >
                Open Recommendation Engine →
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-[#65756f]">
                Recommendations require
                coordinator review before they
                move forward.
              </p>
            </div>
          </div>
        </section>

        {/* HUMAN REVIEW NOTE */}

        <section className="mt-6 rounded-2xl border border-[#dfe9e5] bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f6f1] text-[#087f6b]">
              ✓
            </div>

            <div>
              <p className="text-sm font-semibold text-[#10233c]">
                Human review remains required
              </p>

              <p className="mt-1 text-sm leading-6 text-[#65756f]">
                SurgiCare recommendations support
                outreach planning but do not
                automatically create or deploy
                missions. Coordinators retain
                decision authority.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
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
      className={`rounded-2xl border p-5 ${
        green
          ? "border-[#b9ded3] bg-[#eef9f5]"
          : "border-[#dfe9e5] bg-white"
      }`}
    >
      <p className="text-sm text-[#65756f]">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${
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
          : "border border-[#dfe9e5] bg-white text-[#52635d] hover:bg-[#f6faf8]"
      }`}
    >
      {label}
    </button>
  );
}

function FacilityCard({
  facility,
  updating,
  onApprove,
  onReject,
}: {
  facility: FacilityWithStats;
  updating: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  let statusClass =
    "bg-[#fff7df] text-[#946900]";

  let statusText =
    "Pending verification";

  if (
    facility.verification_status ===
    "approved"
  ) {
    statusClass =
      "bg-[#e7f6f1] text-[#087f6b]";

    statusText = "Approved";
  }

  if (
    facility.verification_status ===
    "rejected"
  ) {
    statusClass =
      "bg-red-50 text-red-700";

    statusText = "Rejected";
  }

  return (
    <article className="rounded-2xl border border-[#dfe9e5] bg-[#fbfdfc] p-5 md:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="text-xl font-bold text-[#10233c]">
              {facility.name}
            </h4>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
            >
              {statusText}
            </span>
          </div>

          <p className="mt-2 text-sm font-medium text-[#087f6b]">
            {facility.facility_type}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Location"
              value={[
                facility.district,
                facility.region,
              ]
                .filter(Boolean)
                .join(", ")}
            />

            <Info
              label="GPS address"
              value={
                facility.gps_address ||
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
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="text-xs text-[#65756f]">
                Patients
              </p>

              <p className="mt-1 text-xl font-bold text-[#10233c]">
                {facility.patient_count}
              </p>
            </div>

            <div className="rounded-xl bg-[#e7f6f1] px-4 py-3">
              <p className="text-xs text-[#087f6b]">
                Ready now
              </p>

              <p className="mt-1 text-xl font-bold text-[#087f6b]">
                {facility.ready_count}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 xl:w-44 xl:flex-col">
          {facility.verification_status !==
            "approved" && (
            <button
              type="button"
              disabled={updating}
              onClick={onApprove}
              className="flex-1 rounded-xl bg-[#087f6b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#056554] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updating
                ? "Updating..."
                : "Approve"}
            </button>
          )}

          {facility.verification_status !==
            "rejected" && (
            <button
              type="button"
              disabled={updating}
              onClick={onReject}
              className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reject
            </button>
          )}
        </div>
      </div>
    </article>
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
        {value || "Not provided"}
      </p>
    </div>
  );
}