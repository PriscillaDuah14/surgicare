"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Profile = {
  full_name: string | null;
  role: string;
};

type Facility = {
  id: string;
  name: string;
  district: string | null;
  region: string | null;
  gps_address: string | null;
  verification_status: string;
};

type CoordinatorRequest = {
  id: string;
  status: string;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [facility, setFacility] = useState<Facility | null>(null);

  const [patientCount, setPatientCount] = useState(0);
  const [readyPatientCount, setReadyPatientCount] = useState(0);

  const [coordinatorRequest, setCoordinatorRequest] =
    useState<CoordinatorRequest | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const userId = session.user.id;

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", userId)
          .single();

      if (profileError) {
        console.error(profileError);
      }

      if (profileData) {
        setProfile(profileData);
      }

      const { data: requestData, error: requestError } =
        await supabase
          .from("coordinator_requests")
          .select("id, status")
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (requestError) {
        console.error(requestError);
      } else {
        setCoordinatorRequest(requestData || null);
      }

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
        setFacility(null);
        setPatientCount(0);
        setReadyPatientCount(0);
        setLoading(false);
        return;
      }

      const facilityId = memberships[0].facility_id;

      const { data: facilityData, error: facilityError } =
        await supabase
          .from("facilities")
          .select(
            "id, name, district, region, gps_address, verification_status"
          )
          .eq("id", facilityId)
          .single();

      if (facilityError) {
        console.error(facilityError);
        setError("Unable to load your facility.");
        setLoading(false);
        return;
      }

      if (facilityData) {
        setFacility(facilityData);
      }

      const {
        count: totalPatients,
        error: patientCountError,
      } = await supabase
        .from("patients")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("facility_id", facilityId);

      if (patientCountError) {
        console.error(patientCountError);
      } else {
        setPatientCount(totalPatients ?? 0);
      }

      const { count: readyCount, error: readyError } =
        await supabase
          .from("patients")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("facility_id", facilityId)
          .eq("surgical_readiness", "ready")
          .neq("booking_status", "removed");

      if (readyError) {
        console.error(readyError);
      } else {
        setReadyPatientCount(readyCount ?? 0);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Loading SurgiCare...
          </p>
        </div>
      </main>
    );
  }

  const firstName =
    profile?.full_name?.trim().split(" ")[0] || "Clinician";

  const facilityStatus =
    facility?.verification_status || "not_setup";

  let facilityStatusText = "Not set up";

  let facilityStatusClass =
    "bg-[#edf1ef] text-[#687873]";

  if (facilityStatus === "approved") {
    facilityStatusText = "Verified";
    facilityStatusClass =
      "bg-[#e7f6f1] text-[#087f6b]";
  }

  if (facilityStatus === "pending") {
    facilityStatusText = "Pending verification";
    facilityStatusClass =
      "bg-[#fff7df] text-[#946900]";
  }

  if (facilityStatus === "rejected") {
    facilityStatusText = "Rejected";
    facilityStatusClass =
      "bg-red-50 text-red-700";
  }

  const requestPending =
    coordinatorRequest?.status === "pending";

  const requestRejected =
    coordinatorRequest?.status === "rejected";

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      {/* HEADER */}

      <header className="sticky top-0 z-20 border-b border-[#dfe9e5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#087f6b] text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
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
              <h1 className="text-xl font-bold text-[#10233c]">
                SurgiCare
              </h1>

              <p className="text-xs font-medium text-[#087f6b]">
                Eye-Care Outreach
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[#10233c]">
                {profile?.full_name || "Clinician"}
              </p>

              <p className="text-xs capitalize text-[#65756f]">
                {profile?.role || "clinician"}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-[#dfe9e5] bg-white px-4 py-2 text-sm font-semibold text-[#52635d] hover:bg-[#f2f7f5]"
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
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5" />

            <div className="relative z-10">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                Clinician Workspace
              </span>

              <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                Welcome, {firstName}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 md:text-base">
                Manage your facility, register screened patients
                and prepare your community for upcoming surgical
                outreach missions.
              </p>
            </div>
          </div>
        </section>

        {/* COORDINATOR ACCESS */}

        {profile?.role === "clinician" && (
          <section className="mt-6">
            {!requestPending && (
              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    "/request-coordinator";
                }}
                className="w-full rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-5 text-left transition hover:border-[#87c9b7] hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#087f6b]">
                      Coordinator access
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-[#10233c]">
                      {requestRejected
                        ? "Request coordinator access again"
                        : "Become a Coordinator"}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-[#65756f]">
                      Request access to the Control Tower,
                      facility review and outreach planning
                      tools.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-xl bg-[#087f6b] px-5 py-3 text-sm font-semibold text-white">
                    Request access →
                  </span>
                </div>
              </button>
            )}

            {requestPending && (
              <div className="rounded-2xl border border-[#f1dfae] bg-[#fff9e8] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#8a6800]">
                      Coordinator request pending
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-[#10233c]">
                      Waiting for administrator approval
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-[#65756f]">
                      Your request has been submitted and is
                      awaiting review.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.href =
                        "/request-coordinator";
                    }}
                    className="shrink-0 rounded-xl border border-[#e9d99e] bg-white px-5 py-3 text-sm font-semibold text-[#886600]"
                  >
                    View request
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* FACILITY */}

        <section className="mt-8 rounded-3xl border border-[#dfe9e5] bg-white p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#087f6b]">
                Your facility
              </p>

              <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
                {facility?.name || "No facility registered"}
              </h3>

              {facility && (
                <p className="mt-2 text-sm text-[#65756f]">
                  {[facility.district, facility.region]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}

              {facility?.gps_address && (
                <p className="mt-1 text-xs text-[#7a8984]">
                  GPS: {facility.gps_address}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${facilityStatusClass}`}
              >
                {facilityStatusText}
              </span>

              <button
                type="button"
                onClick={() => {
                  window.location.href = facility
                    ? "/my-facility"
                    : "/facility";
                }}
                className="rounded-xl border border-[#dfe9e5] px-4 py-2.5 text-sm font-semibold text-[#52635d] hover:bg-[#f6faf8]"
              >
                {facility
                  ? "View facility"
                  : "Set up facility"}
              </button>
            </div>
          </div>
        </section>

        {/* STATS */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Facility status"
            value={facilityStatusText}
          />

          <StatCard
            label="Patients registered"
            value={String(patientCount)}
          />

          <StatCard
            label="Ready for surgery"
            value={String(readyPatientCount)}
          />

          <StatCard
            label="Upcoming missions"
            value="0"
          />
        </section>

        {/* WORKSPACE */}

        <section className="mt-10">
          <p className="text-sm font-semibold text-[#087f6b]">
            Your workspace
          </p>

          <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
            Outreach management
          </h3>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <ActionCard
              title="Facility"
              description={
                facility
                  ? "Open your facility workspace, patient roster and operational overview."
                  : "Set up your facility to begin managing patients and outreach readiness."
              }
              badge={facilityStatusText}
              badgeClass={facilityStatusClass}
              onClick={() => {
                window.location.href = facility
                  ? "/my-facility"
                  : "/facility";
              }}
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                  <path d="M9 21v-6h6v6" />
                </svg>
              }
            />

            <ActionCard
              title="Quick Patient Add"
              description="Book and screen a patient using the rapid SurgiCare clinical workflow."
              badge={`${patientCount} registered`}
              badgeClass="bg-[#edf5ff] text-[#3569a8]"
              onClick={() => {
                window.location.href = "/book-patient";
              }}
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
                  <path d="M19 8v6" />
                  <path d="M16 11h6" />
                </svg>
              }
            />

            <ActionCard
              title="Outreach Pool"
              description="View registered patients available for future outreach planning."
              badge={`${readyPatientCount} ready now`}
              badgeClass="bg-[#e7f6f1] text-[#087f6b]"
              onClick={() => {
                window.location.href = "/outreach";
              }}
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s7-4.5 7-12a7 7 0 1 0-14 0c0 7.5 7 12 7 12Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              }
            />
          </div>
        </section>

        {facility &&
          facility.verification_status === "pending" && (
            <section className="mt-8 rounded-2xl border border-[#f1dfae] bg-[#fff9e8] p-5">
              <p className="font-semibold text-[#7f6200]">
                Facility verification pending
              </p>

              <p className="mt-1 text-sm leading-6 text-[#826f32]">
                Your facility is awaiting coordinator review.
              </p>
            </section>
          )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dfe9e5] bg-white p-5">
      <p className="text-sm text-[#65756f]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-[#10233c]">
        {value}
      </p>
    </div>
  );
}

function ActionCard({
  title,
  description,
  badge,
  badgeClass,
  onClick,
  icon,
}: {
  title: string;
  description: string;
  badge: string;
  badgeClass: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[#dfe9e5] bg-white p-6 text-left transition hover:-translate-y-1 hover:border-[#a9d3c8] hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e7f6f1] text-[#087f6b]">
        {icon}
      </div>

      <h4 className="mt-5 text-lg font-bold text-[#10233c]">
        {title}
      </h4>

      <p className="mt-2 text-sm leading-6 text-[#65756f]">
        {description}
      </p>

      <span
        className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
      >
        {badge}
      </span>
    </button>
  );
}