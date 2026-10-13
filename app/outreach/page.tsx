"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Facility = {
  id: string;
  name: string;
  district: string | null;
  region: string | null;
};

type Patient = {
  id: string;
  full_name: string;
  nhis_membership_no: string | null;
  age: number | null;
  sex: string | null;
  phone_patient: string | null;
  community: string | null;
  district: string | null;
  preferred_language: string | null;
  nhis_status: string;
  created_at: string;
};

type ClinicalRecord = {
  patient_id: string;
  diagnosis: string;
  eye: string;
  visual_acuity_re: string | null;
  visual_acuity_le: string | null;
  surgical_readiness: string;
  has_htn: boolean;
  has_diabetes: boolean;
  has_allergy: boolean;
  on_anticoagulant: boolean;
};

type OutreachPatient = Patient & {
  clinical: ClinicalRecord | null;
};

type FilterType =
  | "all"
  | "ready"
  | "cataract"
  | "pterygium"
  | "nhis_pending";

export default function OutreachPage() {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [patients, setPatients] = useState<OutreachPatient[]>([]);

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOutreachPool() {
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const userId = session.user.id;

      // ---------------------------------------
      // FACILITY MEMBERSHIP
      // ---------------------------------------

      const { data: memberships, error: membershipError } =
        await supabase
          .from("facility_staff")
          .select("facility_id")
          .eq("user_id", userId)
          .eq("is_active", true);

      if (membershipError) {
        console.error(membershipError);
        setError("Unable to load your facility membership.");
        setLoading(false);
        return;
      }

      if (!memberships || memberships.length === 0) {
        setError(
          "You must be linked to a facility before viewing the outreach pool."
        );
        setLoading(false);
        return;
      }

      const facilityId = memberships[0].facility_id;

      // ---------------------------------------
      // FACILITY
      // ---------------------------------------

      const { data: facilityData, error: facilityError } =
        await supabase
          .from("facilities")
          .select("id, name, district, region")
          .eq("id", facilityId)
          .single();

      if (facilityError) {
        console.error(facilityError);
        setError("Unable to load the facility.");
        setLoading(false);
        return;
      }

      setFacility(facilityData);

      // ---------------------------------------
      // PATIENTS
      // ---------------------------------------

      const { data: patientRows, error: patientError } =
        await supabase
          .from("patients")
          .select(
            `
            id,
            full_name,
            nhis_membership_no,
            age,
            sex,
            phone_patient,
            community,
            district,
            preferred_language,
            nhis_status,
            created_at
          `
          )
          .eq("facility_id", facilityId)
          .order("created_at", { ascending: false });

      if (patientError) {
        console.error(patientError);
        setError("Unable to load registered patients.");
        setLoading(false);
        return;
      }

      if (!patientRows || patientRows.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const patientIds = patientRows.map((patient) => patient.id);

      // ---------------------------------------
      // CLINICAL RECORDS
      // ---------------------------------------

      const { data: clinicalRows, error: clinicalError } =
        await supabase
          .from("patient_clinical_records")
          .select(
            `
            patient_id,
            diagnosis,
            eye,
            visual_acuity_re,
            visual_acuity_le,
            surgical_readiness,
            has_htn,
            has_diabetes,
            has_allergy,
            on_anticoagulant
          `
          )
          .in("patient_id", patientIds);

      if (clinicalError) {
        console.error(clinicalError);
        setError("Unable to load patient clinical records.");
        setLoading(false);
        return;
      }

      const clinicalMap = new Map<string, ClinicalRecord>();

      for (const record of clinicalRows || []) {
        clinicalMap.set(record.patient_id, record);
      }

      const combined: OutreachPatient[] = patientRows.map((patient) => ({
        ...patient,
        clinical: clinicalMap.get(patient.id) || null,
      }));

      setPatients(combined);
      setLoading(false);
    }

    loadOutreachPool();
  }, []);

  const counts = useMemo(() => {
    const total = patients.length;

    const ready = patients.filter(
      (patient) =>
        patient.clinical?.surgical_readiness === "Ready Now"
    ).length;

    const cataract = patients.filter((patient) => {
      return (
        patient.clinical?.diagnosis === "Cataract" ||
        patient.clinical?.diagnosis === "Both"
      );
    }).length;

    const pterygium = patients.filter((patient) => {
      return (
        patient.clinical?.diagnosis === "Pterygium" ||
        patient.clinical?.diagnosis === "Both"
      );
    }).length;

    const nhisPending = patients.filter(
      (patient) => patient.nhis_status !== "active"
    ).length;

    return {
      total,
      ready,
      cataract,
      pterygium,
      nhisPending,
    };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    let result = [...patients];

    if (filter === "ready") {
      result = result.filter(
        (patient) =>
          patient.clinical?.surgical_readiness === "Ready Now"
      );
    }

    if (filter === "cataract") {
      result = result.filter((patient) => {
        return (
          patient.clinical?.diagnosis === "Cataract" ||
          patient.clinical?.diagnosis === "Both"
        );
      });
    }

    if (filter === "pterygium") {
      result = result.filter((patient) => {
        return (
          patient.clinical?.diagnosis === "Pterygium" ||
          patient.clinical?.diagnosis === "Both"
        );
      });
    }

    if (filter === "nhis_pending") {
      result = result.filter(
        (patient) => patient.nhis_status !== "active"
      );
    }

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((patient) => {
        const values = [
          patient.full_name,
          patient.nhis_membership_no || "",
          patient.community || "",
          patient.district || "",
          patient.clinical?.diagnosis || "",
          patient.clinical?.surgical_readiness || "",
        ];

        return values.some((value) =>
          value.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [patients, filter, search]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Loading outreach pool...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      {/* HEADER */}

      <header className="sticky top-0 z-20 border-b border-[#dfe9e5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087f6b] text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
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
              <p className="font-bold text-[#10233c]">
                SurgiCare
              </p>

              <p className="text-xs text-[#65756f]">
                Outreach Pool
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="rounded-lg border border-[#dfe9e5] px-4 py-2 text-sm font-semibold text-[#52635d] hover:bg-[#f6faf8]"
          >
            Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {/* HERO */}

        <section className="overflow-hidden rounded-3xl bg-[#087f6b]">
          <div className="relative px-6 py-8 md:px-10 md:py-10">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5" />

            <div className="relative z-10">
              <p className="text-sm font-semibold text-emerald-100">
                Patient aggregation
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Outreach Pool
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 md:text-base">
                Review registered patients, readiness status and
                clinical categories before future outreach mission
                planning.
              </p>

              {facility && (
                <div className="mt-5 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white">
                  {facility.name}
                  {facility.district
                    ? ` • ${facility.district}`
                    : ""}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* STATS */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total patients"
            value={counts.total}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />

          <StatCard
            label="Ready now"
            value={counts.ready}
            active={filter === "ready"}
            onClick={() => setFilter("ready")}
          />

          <StatCard
            label="Cataract"
            value={counts.cataract}
            active={filter === "cataract"}
            onClick={() => setFilter("cataract")}
          />

          <StatCard
            label="Pterygium"
            value={counts.pterygium}
            active={filter === "pterygium"}
            onClick={() => setFilter("pterygium")}
          />

          <StatCard
            label="NHIS pending"
            value={counts.nhisPending}
            active={filter === "nhis_pending"}
            onClick={() => setFilter("nhis_pending")}
          />
        </section>

        {/* SEARCH + ACTION */}

        <section className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-md">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, NHIS, community..."
              className="w-full rounded-xl border border-[#dfe9e5] bg-white px-4 py-3.5 text-sm text-[#10231f] outline-none transition placeholder:text-slate-400 focus:border-[#087f6b] focus:ring-4 focus:ring-[#087f6b]/10"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/patients";
            }}
            className="rounded-xl bg-[#087f6b] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#056554]"
          >
            + Add patient
          </button>
        </section>

        {/* POOL */}

        <section className="mt-6">
          {filteredPatients.length === 0 ? (
            <div className="rounded-3xl border border-[#dfe9e5] bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f6f1] text-[#087f6b]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
                </svg>
              </div>

              <h2 className="mt-4 text-xl font-bold text-[#10233c]">
                No patients found
              </h2>

              <p className="mt-2 text-sm text-[#65756f]">
                Add patients or change your current filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredPatients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                />
              ))}
            </div>
          )}
        </section>

        {/* FOOTER NOTE */}

        <section className="mt-8 rounded-2xl border border-[#dfe9e5] bg-white p-5">
          <p className="text-sm font-semibold text-[#10233c]">
            Outreach planning status
          </p>

          <p className="mt-2 text-sm leading-6 text-[#65756f]">
            These patients are currently available for aggregation.
            The next development phase will allow coordinators to view
            multiple facilities together and generate proposed outreach
            clusters using the SurgiCare recommendation engine.
          </p>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        active
          ? "border-[#87c9b7] bg-[#edf8f4]"
          : "border-[#dfe9e5] bg-white hover:border-[#b8dcd0]"
      }`}
    >
      <p className="text-sm text-[#65756f]">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-[#10233c]">
        {value}
      </p>
    </button>
  );
}

function PatientCard({
  patient,
}: {
  patient: OutreachPatient;
}) {
  const clinical = patient.clinical;

  const readinessClass =
    clinical?.surgical_readiness === "Ready Now"
      ? "bg-[#e7f6f1] text-[#087f6b]"
      : clinical?.surgical_readiness === "Needs Biometry"
      ? "bg-[#edf5ff] text-[#3569a8]"
      : "bg-[#fff7df] text-[#946900]";

  const nhisClass =
    patient.nhis_status === "active"
      ? "bg-[#e7f6f1] text-[#087f6b]"
      : patient.nhis_status === "inactive"
      ? "bg-red-50 text-red-700"
      : "bg-[#fff7df] text-[#946900]";

  const comorbidities = [
    clinical?.has_htn ? "HTN" : null,
    clinical?.has_diabetes ? "Diabetes" : null,
    clinical?.has_allergy ? "Allergy" : null,
    clinical?.on_anticoagulant ? "Anticoagulant" : null,
  ].filter(Boolean);

  return (
    <article className="rounded-3xl border border-[#dfe9e5] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-[#10233c]">
              {patient.full_name}
            </h2>

            {clinical?.diagnosis && (
              <span className="rounded-full bg-[#f0f4f2] px-3 py-1 text-xs font-semibold text-[#52635d]">
                {clinical.diagnosis}
              </span>
            )}

            {clinical?.eye && (
              <span className="rounded-full bg-[#f0f4f2] px-3 py-1 text-xs font-semibold text-[#52635d]">
                {clinical.eye}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Age / Sex"
              value={`${patient.age ?? "—"} / ${
                patient.sex === "M"
                  ? "Male"
                  : patient.sex === "F"
                  ? "Female"
                  : "—"
              }`}
            />

            <Info
              label="Community"
              value={patient.community || "Not provided"}
            />

            <Info
              label="NHIS number"
              value={
                patient.nhis_membership_no || "Not provided"
              }
            />

            <Info
              label="Language"
              value={
                patient.preferred_language || "Not provided"
              }
            />
          </div>

          {clinical && (
            <div className="mt-5 rounded-2xl bg-[#f8fbfa] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
                Clinical snapshot
              </p>

              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Info
                  label="Diagnosis"
                  value={clinical.diagnosis}
                />

                <Info
                  label="Affected eye"
                  value={clinical.eye}
                />

                <Info
                  label="VA Right"
                  value={clinical.visual_acuity_re || "—"}
                />

                <Info
                  label="VA Left"
                  value={clinical.visual_acuity_le || "—"}
                />
              </div>

              {comorbidities.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-[#65756f]">
                    Comorbidity flags
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {comorbidities.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#dfe9e5] bg-white px-3 py-1 text-xs font-semibold text-[#52635d]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-row flex-wrap gap-2 lg:w-48 lg:flex-col">
          <span
            className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${readinessClass}`}
          >
            {clinical?.surgical_readiness ||
              "Readiness unavailable"}
          </span>

          <span
            className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${nhisClass}`}
          >
            NHIS:{" "}
            {patient.nhis_status === "active"
              ? "Active"
              : patient.nhis_status === "inactive"
              ? "Inactive"
              : patient.nhis_status === "invalid"
              ? "Invalid"
              : "Unchecked"}
          </span>
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

      <p className="mt-1 font-semibold text-[#10233c]">
        {value}
      </p>
    </div>
  );
}