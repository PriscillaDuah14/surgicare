"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

/* =========================================
   TYPES
========================================= */

type Cluster = {
  id: string;
  cluster_name: string;
  region: string | null;
  district: string | null;
  status: string;

  facility_count: number;
  patient_count: number;
  ready_patient_count: number;

  cataract_count: number;
  pterygium_count: number;

  readiness_percentage: number | string;
  priority_score: number | string;

  recommendation_reason: string | null;

  estimated_cost: number | string | null;

  expected_nhis_reimbursement:
    | number
    | string
    | null;

  recommended_action: string | null;

  deployed_mission_id: string | null;
};

type ClusterFacility = {
  facility_id: string;
  facility_name: string;
  facility_type: string | null;
  district: string | null;
  region: string | null;
  gps_address: string | null;
  verification_status: string;
  patient_count: number | string;
  ready_patient_count: number | string;
};

type Profile = {
  full_name: string | null;
  role: string;
};

/* =========================================
   PAGE
========================================= */

export default function NewMissionPage() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [cluster, setCluster] =
    useState<Cluster | null>(null);

  const [facilities, setFacilities] =
    useState<ClusterFacility[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /* =========================================
     OPERATIONAL FORM
  ========================================= */

  const [missionName, setMissionName] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [surgeonName, setSurgeonName] =
    useState("");

  const [vanId, setVanId] =
    useState("");

  const [clinicalTeamText, setClinicalTeamText] =
    useState("");

  const [
    postOpFacilityConfirmed,
    setPostOpFacilityConfirmed,
  ] = useState(false);

  const [
    referralPathwayConfirmed,
    setReferralPathwayConfirmed,
  ] = useState(false);

  const [
    consumablesConfirmed,
    setConsumablesConfirmed,
  ] = useState(false);

  const [
    equipmentConfirmed,
    setEquipmentConfirmed,
  ] = useState(false);

  const [
    transportConfirmed,
    setTransportConfirmed,
  ] = useState(false);

  const [
    facilityNotificationsSent,
    setFacilityNotificationsSent,
  ] = useState(false);

  const [
    patientNotificationsSent,
    setPatientNotificationsSent,
  ] = useState(false);

  const [
    sponsorContribution,
    setSponsorContribution,
  ] = useState("");

  const [
    facilityContribution,
    setFacilityContribution,
  ] = useState("");

  const [
    clinicSplit,
    setClinicSplit,
  ] = useState("25");

  const [
    vanSplit,
    setVanSplit,
  ] = useState("20");

  const [
    surgeonSplit,
    setSurgeonSplit,
  ] = useState("40");

  const [
    platformSplit,
    setPlatformSplit,
  ] = useState("15");

  const [notes, setNotes] =
    useState("");

  /* =========================================
     INITIALIZE
  ========================================= */

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");

    try {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const clusterId =
        params.get("cluster");

      if (!clusterId) {
        setError(
          "No recommendation cluster was selected."
        );

        setLoading(false);
        return;
      }

      /* AUTH */

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        window.location.href =
          "/login";

        return;
      }

      /* PROFILE */

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq(
          "id",
          session.user.id
        )
        .single();

      if (
        profileError ||
        !profileData
      ) {
        throw new Error(
          "Unable to load your SurgiCare profile."
        );
      }

      if (
        profileData.role !==
          "coordinator" &&
        profileData.role !==
          "admin"
      ) {
        window.location.href =
          "/dashboard";

        return;
      }

      setProfile(profileData);

      /* LOAD CLUSTER */

      const {
        data: clusterData,
        error: clusterError,
      } = await supabase
        .from("clusters")
        .select(
          `
          id,
          cluster_name,
          region,
          district,
          status,
          facility_count,
          patient_count,
          ready_patient_count,
          cataract_count,
          pterygium_count,
          readiness_percentage,
          priority_score,
          recommendation_reason,
          estimated_cost,
          expected_nhis_reimbursement,
          recommended_action,
          deployed_mission_id
          `
        )
        .eq(
          "id",
          clusterId
        )
        .single();

      if (
        clusterError ||
        !clusterData
      ) {
        console.error(
          clusterError
        );

        throw new Error(
          "Unable to load the selected recommendation."
        );
      }

      /*
        Prevent accidentally building another
        mission for an already deployed cluster.
      */

      if (
        clusterData.status ===
          "deployed" ||
        clusterData.deployed_mission_id
      ) {
        throw new Error(
          "This cluster has already been converted into a mission."
        );
      }

      setCluster(clusterData);

      setMissionName(
        `${clusterData.cluster_name} Mission`
      );

      /* LOAD FACILITIES */

      const {
        data: facilityData,
        error: facilityError,
      } = await supabase.rpc(
        "get_cluster_facility_details",
        {
          p_cluster_id:
            clusterId,
        }
      );

      if (facilityError) {
        console.error(
          facilityError
        );

        throw new Error(
          "The cluster loaded, but its facilities could not be loaded."
        );
      }

      setFacilities(
        facilityData || []
      );
    } catch (err) {
      console.error(
        "MISSION BUILDER ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Mission Builder could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================
     COMPUTED VALUES
  ========================================= */

  const readinessItems = [
    postOpFacilityConfirmed,
    referralPathwayConfirmed,
    consumablesConfirmed,
    equipmentConfirmed,
    transportConfirmed,
    facilityNotificationsSent,
    patientNotificationsSent,
  ];

  const readinessCount =
    readinessItems.filter(Boolean)
      .length;

  const readinessPercent =
    Math.round(
      (readinessCount / 7) * 100
    );

  const allReady =
    readinessCount === 7;

  const splitTotal = useMemo(
    () =>
      Number(clinicSplit || 0) +
      Number(vanSplit || 0) +
      Number(surgeonSplit || 0) +
      Number(platformSplit || 0),
    [
      clinicSplit,
      vanSplit,
      surgeonSplit,
      platformSplit,
    ]
  );

  const estimatedCost =
    Number(
      cluster?.estimated_cost || 0
    );

  const expectedNhis =
    Number(
      cluster
        ?.expected_nhis_reimbursement ||
        0
    );

  const sponsorAmount =
    Number(
      sponsorContribution || 0
    );

  const facilityAmount =
    Number(
      facilityContribution || 0
    );

  const expectedFunding =
    expectedNhis +
    sponsorAmount +
    facilityAmount;

  const fundingGap =
    Math.max(
      estimatedCost -
        expectedFunding,
      0
    );

  /* =========================================
     SAVE
  ========================================= */

  async function handleSave(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!cluster) {
      return;
    }

    setError("");
    setMessage("");

    if (!missionName.trim()) {
      setError(
        "Please enter a mission name."
      );

      return;
    }

    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      setError(
        "The mission end date cannot be before the start date."
      );

      return;
    }

    if (
      !Number.isFinite(splitTotal) ||
      splitTotal !== 100
    ) {
      setError(
        "Revenue allocation must total exactly 100%."
      );

      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        window.location.href =
          "/login";

        return;
      }

      /*
        Check again immediately before INSERT
        to reduce accidental duplicate missions.
      */

      const {
        data: existingMission,
        error: duplicateCheckError,
      } = await supabase
        .from("missions")
        .select("id")
        .eq(
          "cluster_id",
          cluster.id
        )
        .limit(1)
        .maybeSingle();

      if (duplicateCheckError) {
        throw duplicateCheckError;
      }

      if (existingMission) {
        throw new Error(
          "A mission has already been created for this cluster."
        );
      }

      const clinicalTeam =
        clinicalTeamText
          .split(",")
          .map(
            (member) =>
              member.trim()
          )
          .filter(Boolean);

      const facilityIds =
        facilities.map(
          (facility) =>
            facility.facility_id
        );

      const facilityNames =
        facilities.map(
          (facility) =>
            facility.facility_name
        );

      /*
        Save as PLANNING.

        Even if all 7 checks are already
        completed, Mission Control remains
        responsible for final deployment.
      */

      const {
        data: mission,
        error: missionError,
      } = await supabase
        .from("missions")
        .insert({
          cluster_id:
            cluster.id,

          mission_name:
            missionName.trim(),

          region:
            cluster.region,

          district:
            cluster.district,

          status:
            allReady
              ? "ready"
              : "planning",

          priority_score:
            Number(
              cluster.priority_score ||
                0
            ),

          patient_count:
            cluster.patient_count,

          ready_patient_count:
            cluster.ready_patient_count,

          cataract_count:
            cluster.cataract_count,

          pterygium_count:
            cluster.pterygium_count,

          estimated_cost:
            cluster.estimated_cost,

          expected_nhis_reimbursement:
            cluster.expected_nhis_reimbursement,

          facility_ids:
            facilityIds,

          facility_names:
            facilityNames,

          van_id:
            vanId.trim() ||
            null,

          surgeon_name:
            surgeonName.trim() ||
            null,

          clinical_team:
            clinicalTeam,

          planned_start_date:
            startDate || null,

          planned_end_date:
            endDate || null,

          post_op_facility_confirmed:
            postOpFacilityConfirmed,

          referral_pathway_confirmed:
            referralPathwayConfirmed,

          consumables_confirmed:
            consumablesConfirmed,

          equipment_confirmed:
            equipmentConfirmed,

          transport_confirmed:
            transportConfirmed,

          facility_notifications_sent:
            facilityNotificationsSent,

          patient_notifications_sent:
            patientNotificationsSent,

          sponsor_contribution:
            sponsorAmount,

          facility_contribution:
            facilityAmount,

          clinic_split_percentage:
            Number(
              clinicSplit || 0
            ),

          van_split_percentage:
            Number(
              vanSplit || 0
            ),

          surgeon_split_percentage:
            Number(
              surgeonSplit || 0
            ),

          platform_split_percentage:
            Number(
              platformSplit || 0
            ),

          notes:
            notes.trim() ||
            null,

          created_by:
            session.user.id,
        })
        .select("id")
        .single();

      if (
        missionError ||
        !mission
      ) {
        console.error(
          missionError
        );

        throw new Error(
          missionError?.message ||
            "Mission could not be saved."
        );
      }

      /*
        We deliberately do NOT mark the cluster
        as deployed here.

        Building != deploying.
      */

      setMessage(
        "Mission created successfully. Opening Mission Control..."
      );

      setTimeout(() => {
        window.location.href =
          "/missions";
      }, 900);
    } catch (err) {
      console.error(
        "SAVE MISSION ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Mission could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm text-[#65756f]">
            Preparing Mission Builder...
          </p>
        </div>
      </main>
    );
  }

  /* =========================================
     LOAD ERROR
  ========================================= */

  if (!cluster) {
    return (
      <main className="min-h-screen bg-[#f6faf8] p-6">
        <div className="mx-auto max-w-3xl pt-20">
          <div className="rounded-3xl border border-red-200 bg-white p-8">
            <p className="text-sm font-semibold text-red-600">
              Mission Builder
            </p>

            <h1 className="mt-2 text-2xl font-bold text-[#10233c]">
              Mission could not be prepared
            </h1>

            <p className="mt-3 text-sm text-[#65756f]">
              {error ||
                "The selected cluster could not be loaded."}
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/coordinator/recommendations";
              }}
              className="mt-6 rounded-xl bg-[#087f6b] px-5 py-3 text-sm font-semibold text-white"
            >
              Back to Recommendations
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-[#dfe9e5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/coordinator";
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

              <p className="text-xs font-medium text-[#087f6b]">
                Mission Builder
              </p>
            </div>
          </button>

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
                  "/coordinator/recommendations";
              }}
              className="rounded-xl border border-[#dfe9e5] bg-white px-4 py-2 text-sm font-semibold text-[#52635d]"
            >
              Recommendations
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {/* HERO */}

        <section className="overflow-hidden rounded-3xl bg-[#087f6b]">
          <div className="relative px-6 py-9 md:px-10 md:py-11">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />

            <div className="relative z-10 max-w-3xl">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                Recommendation → Operations
              </span>

              <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                Build Surgical Mission
              </h2>

              <p className="mt-3 text-sm leading-6 text-emerald-50">
                Convert an approved outreach recommendation into
                an operational plan before deployment.
              </p>
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
          <div className="mt-6 rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-4 text-sm font-semibold text-[#08705f]">
            ✓ {message}
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="mt-8 space-y-8"
        >
          {/* SOURCE CLUSTER */}

          <section className="rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-semibold text-[#087f6b]">
                  Source Recommendation
                </p>

                <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
                  {cluster.cluster_name}
                </h3>

                <p className="mt-2 text-sm text-[#65756f]">
                  {[
                    cluster.district,
                    cluster.region,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>

              <div className="rounded-2xl bg-[#e7f6f1] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#65756f]">
                  Priority
                </p>

                <p className="mt-1 text-2xl font-bold text-[#087f6b]">
                  {Number(
                    cluster.priority_score ||
                      0
                  ).toFixed(1)}
                  /100
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <LockedMetric
                label="Facilities"
                value={
                  cluster.facility_count
                }
              />

              <LockedMetric
                label="Patients"
                value={
                  cluster.patient_count
                }
              />

              <LockedMetric
                label="Ready"
                value={
                  cluster.ready_patient_count
                }
                green
              />

              <LockedMetric
                label="Cataract"
                value={
                  cluster.cataract_count
                }
              />

              <LockedMetric
                label="Pterygium"
                value={
                  cluster.pterygium_count
                }
              />
            </div>

            <div className="mt-5 rounded-2xl bg-[#f8fbfa] p-4 text-xs text-[#65756f]">
              🔒 Recommendation-derived data is locked to preserve
              the original clinical planning record.
            </div>
          </section>

          {/* FACILITIES */}

          <section className="rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
            <SectionHeading
              eyebrow="Mission Footprint"
              title="Facilities Included"
              description={`${facilities.length} facilities will be attached to this mission automatically.`}
            />

            {facilities.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-[#dfe9e5] bg-[#f8fbfa] p-5 text-sm text-[#65756f]">
                No facilities are currently linked to this cluster.
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {facilities.map(
                  (facility) => (
                    <div
                      key={
                        facility.facility_id
                      }
                      className="rounded-2xl border border-[#dfe9e5] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#10233c]">
                            {
                              facility.facility_name
                            }
                          </p>

                          <p className="mt-1 text-sm text-[#65756f]">
                            {[
                              facility.district,
                              facility.region,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>

                        <span className="rounded-full bg-[#e7f6f1] px-2.5 py-1 text-xs font-semibold text-[#087f6b]">
                          Included
                        </span>
                      </div>

                      <div className="mt-4 flex gap-5">
                        <SmallStat
                          label="Patients"
                          value={Number(
                            facility.patient_count ||
                              0
                          )}
                        />

                        <SmallStat
                          label="Ready"
                          value={Number(
                            facility.ready_patient_count ||
                              0
                          )}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* MISSION IDENTITY */}

          <section className="rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
            <SectionHeading
              eyebrow="Step 1"
              title="Mission Identity & Schedule"
              description="Define when this outreach mission will take place."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel>
                  Mission Name
                </FieldLabel>

                <input
                  value={missionName}
                  onChange={(event) =>
                    setMissionName(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#cfdcd7] px-4 py-3 outline-none focus:border-[#087f6b]"
                  placeholder="Mission name"
                />
              </div>

              <div>
                <FieldLabel>
                  Planned Start Date
                </FieldLabel>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#cfdcd7] px-4 py-3 outline-none focus:border-[#087f6b]"
                />
              </div>

              <div>
                <FieldLabel>
                  Planned End Date
                </FieldLabel>

                <input
                  type="date"
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#cfdcd7] px-4 py-3 outline-none focus:border-[#087f6b]"
                />
              </div>
            </div>
          </section>

          {/* CLINICAL OPS */}

          <section className="rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
            <SectionHeading
              eyebrow="Step 2"
              title="Clinical Operations"
              description="Assign the people and mobile resources responsible for delivery."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>
                  Lead Surgeon
                </FieldLabel>

                <input
                  value={surgeonName}
                  onChange={(event) =>
                    setSurgeonName(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Dr. Kwame Mensah"
                  className="mt-2 w-full rounded-xl border border-[#cfdcd7] px-4 py-3 outline-none focus:border-[#087f6b]"
                />
              </div>

              <div>
                <FieldLabel>
                  Mobile Unit / Van
                </FieldLabel>

                <input
                  value={vanId}
                  onChange={(event) =>
                    setVanId(
                      event.target.value
                    )
                  }
                  placeholder="e.g. SC-VAN-01"
                  className="mt-2 w-full rounded-xl border border-[#cfdcd7] px-4 py-3 outline-none focus:border-[#087f6b]"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>
                  Clinical Team
                </FieldLabel>

                <textarea
                  value={
                    clinicalTeamText
                  }
                  onChange={(event) =>
                    setClinicalTeamText(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Nurse Ama Boateng, Nurse Efua Asare, Technician Kojo Owusu"
                  className="mt-2 w-full rounded-xl border border-[#cfdcd7] px-4 py-3 outline-none focus:border-[#087f6b]"
                />

                <p className="mt-2 text-xs text-[#7a8984]">
                  Separate team members with commas.
                </p>
              </div>
            </div>
          </section>

          {/* READINESS */}

          <section className="rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <SectionHeading
                eyebrow="Step 3"
                title="Operational Readiness"
                description="Confirm every requirement before final deployment."
              />

              <div className="min-w-40 rounded-2xl bg-[#f8fbfa] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#65756f]">
                    {readinessCount}/7
                  </span>

                  <span className="text-sm font-bold text-[#087f6b]">
                    {readinessPercent}%
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfe9e5]">
                  <div
                    className="h-full rounded-full bg-[#087f6b]"
                    style={{
                      width: `${readinessPercent}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-2">
              <ReadinessCheck
                label="Post-op facility confirmed"
                checked={
                  postOpFacilityConfirmed
                }
                onChange={
                  setPostOpFacilityConfirmed
                }
              />

              <ReadinessCheck
                label="Referral pathway confirmed"
                checked={
                  referralPathwayConfirmed
                }
                onChange={
                  setReferralPathwayConfirmed
                }
              />

              <ReadinessCheck
                label="Consumables confirmed"
                checked={
                  consumablesConfirmed
                }
                onChange={
                  setConsumablesConfirmed
                }
              />

              <ReadinessCheck
                label="Equipment confirmed"
                checked={
                  equipmentConfirmed
                }
                onChange={
                  setEquipmentConfirmed
                }
              />

              <ReadinessCheck
                label="Transport confirmed"
                checked={
                  transportConfirmed
                }
                onChange={
                  setTransportConfirmed
                }
              />

              <ReadinessCheck
                label="Facility notifications sent"
                checked={
                  facilityNotificationsSent
                }
                onChange={
                  setFacilityNotificationsSent
                }
              />

              <ReadinessCheck
                label="Patient notifications sent"
                checked={
                  patientNotificationsSent
                }
                onChange={
                  setPatientNotificationsSent
                }
              />
            </div>

            <div
              className={`mt-6 rounded-2xl border p-4 ${
                allReady
                  ? "border-[#b9ded3] bg-[#eef9f5]"
                  : "border-[#eadba8] bg-[#fff9e8]"
              }`}
            >
              <p
                className={`font-semibold ${
                  allReady
                    ? "text-[#087f6b]"
                    : "text-[#886600]"
                }`}
              >
                {allReady
                  ? "✓ Operationally ready"
                  : `Deployment locked — ${readinessCount}/7 checks complete`}
              </p>
            </div>
          </section>

          {/* FINANCE */}

          <section className="rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
            <SectionHeading
              eyebrow="Step 4"
              title="Mission Finance"
              description="Review the projected cost and funding position."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <FinanceCard
                label="Estimated Cost"
                amount={estimatedCost}
              />

              <FinanceCard
                label="Expected NHIS"
                amount={expectedNhis}
              />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>
                  Sponsor Contribution
                </FieldLabel>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    sponsorContribution
                  }
                  onChange={(event) =>
                    setSponsorContribution(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#cfdcd7] px-4 py-3 outline-none focus:border-[#087f6b]"
                  placeholder="0"
                />
              </div>

              <div>
                <FieldLabel>
                  Facility Contribution
                </FieldLabel>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    facilityContribution
                  }
                  onChange={(event) =>
                    setFacilityContribution(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#cfdcd7] px-4 py-3 outline-none focus:border-[#087f6b]"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-[#f8fbfa] p-5">
              <div className="space-y-3">
                <FinanceRow
                  label="Estimated mission cost"
                  amount={estimatedCost}
                />

                <FinanceRow
                  label="Expected NHIS reimbursement"
                  amount={expectedNhis}
                />

                <FinanceRow
                  label="Sponsor contribution"
                  amount={sponsorAmount}
                />

                <FinanceRow
                  label="Facility contribution"
                  amount={facilityAmount}
                />

                <div className="border-t border-[#dfe9e5] pt-3">
                  <FinanceRow
                    label="Expected funding"
                    amount={expectedFunding}
                    bold
                  />

                  <FinanceRow
                    label="Funding gap"
                    amount={fundingGap}
                    bold
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ALLOCATION */}

          <section className="rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
            <SectionHeading
              eyebrow="Step 5"
              title="Revenue Allocation"
              description="Allocation percentages must total exactly 100%."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <PercentInput
                label="Clinic"
                value={clinicSplit}
                onChange={
                  setClinicSplit
                }
              />

              <PercentInput
                label="Van"
                value={vanSplit}
                onChange={
                  setVanSplit
                }
              />

              <PercentInput
                label="Surgeon"
                value={surgeonSplit}
                onChange={
                  setSurgeonSplit
                }
              />

              <PercentInput
                label="Platform"
                value={platformSplit}
                onChange={
                  setPlatformSplit
                }
              />
            </div>

            <div
              className={`mt-5 rounded-2xl p-4 ${
                splitTotal === 100
                  ? "bg-[#eef9f5] text-[#087f6b]"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <p className="font-semibold">
                Total allocation:{" "}
                {splitTotal}%
              </p>

              {splitTotal !== 100 && (
                <p className="mt-1 text-xs">
                  Adjust the percentages before saving.
                </p>
              )}
            </div>
          </section>

          {/* NOTES */}

          <section className="rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
            <SectionHeading
              eyebrow="Step 6"
              title="Mission Notes"
              description="Add operational instructions or context for the mission team."
            />

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              rows={6}
              className="mt-6 w-full rounded-xl border border-[#cfdcd7] px-4 py-3 outline-none focus:border-[#087f6b]"
              placeholder="Add mission notes..."
            />
          </section>

          {/* FINAL ACTION */}

          <section className="rounded-3xl border border-[#b9ded3] bg-[#eef9f5] p-6 md:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <p className="text-sm font-semibold text-[#087f6b]">
                  Mission Builder
                </p>

                <h3 className="mt-1 text-xl font-bold text-[#10233c]">
                  Save operational plan
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52635d]">
                  Saving creates the mission in Mission Control.
                  It does not deploy it automatically. Final
                  deployment remains a separate coordinator action.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      "/coordinator/recommendations";
                  }}
                  className="rounded-xl border border-[#b9ded3] bg-white px-5 py-3 font-semibold text-[#52635d]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    splitTotal !== 100
                  }
                  className="rounded-xl bg-[#087f6b] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Creating Mission..."
                    : allReady
                    ? "Create Ready Mission →"
                    : `Save Mission (${readinessCount}/7 Ready) →`}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

/* =========================================
   COMPONENTS
========================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#087f6b]">
        {eyebrow}
      </p>

      <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#65756f]">
        {description}
      </p>
    </div>
  );
}

function FieldLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-semibold text-[#10233c]">
      {children}
    </label>
  );
}

function LockedMetric({
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
          : "border-[#dfe9e5] bg-[#f8fbfa]"
      }`}
    >
      <p className="text-xs text-[#65756f]">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${
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

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-xs text-[#7a8984]">
        {label}
      </p>

      <p className="mt-1 font-bold text-[#10233c]">
        {value}
      </p>
    </div>
  );
}

function ReadinessCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (
    value: boolean
  ) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
        checked
          ? "border-[#9fd4c4] bg-[#eef9f5]"
          : "border-[#dfe9e5] bg-white"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        className="h-5 w-5 accent-[#087f6b]"
      />

      <span
        className={`text-sm font-semibold ${
          checked
            ? "text-[#087f6b]"
            : "text-[#52635d]"
        }`}
      >
        {checked ? "✓ " : ""}
        {label}
      </span>
    </label>
  );
}

function FinanceCard({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  return (
    <div className="rounded-2xl border border-[#dfe9e5] bg-[#f8fbfa] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#65756f]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-[#10233c]">
        GHS{" "}
        {amount.toLocaleString()}
      </p>
    </div>
  );
}

function FinanceRow({
  label,
  amount,
  bold = false,
}: {
  label: string;
  amount: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          bold
            ? "font-semibold text-[#10233c]"
            : "text-sm text-[#65756f]"
        }
      >
        {label}
      </span>

      <span
        className={
          bold
            ? "font-bold text-[#10233c]"
            : "text-sm font-semibold text-[#10233c]"
        }
      >
        GHS{" "}
        {amount.toLocaleString()}
      </span>
    </div>
  );
}

function PercentInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div>
      <FieldLabel>
        {label}
      </FieldLabel>

      <div className="relative mt-2">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-[#cfdcd7] px-4 py-3 pr-10 outline-none focus:border-[#087f6b]"
        />

        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-[#65756f]">
          %
        </span>
      </div>
    </div>
  );
}