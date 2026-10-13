"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

/* ========================================
   TYPES
======================================== */

type Profile = {
  full_name: string | null;
  role: string;
};

type MissionStatus =
  | "planning"
  | "ready"
  | "deployed"
  | "completed"
  | "cancelled";

type Mission = {
  id: string;
  cluster_id: string | null;

  mission_name: string;
  region: string | null;
  district: string | null;

  status: MissionStatus;

  priority_score: number | null;

  patient_count: number;
  ready_patient_count: number;
  cataract_count: number;
  pterygium_count: number;

  estimated_cost: number | null;
  expected_nhis_reimbursement: number | null;

  van_id: string | null;
  surgeon_name: string | null;

  planned_start_date: string | null;
  planned_end_date: string | null;

  post_op_facility_confirmed: boolean;
  referral_pathway_confirmed: boolean;
  consumables_confirmed: boolean;
  facility_notifications_sent: boolean;

  equipment_confirmed: boolean;
  transport_confirmed: boolean;
  patient_notifications_sent: boolean;

  facility_ids: string[];
  facility_names: string[];
  clinical_team: string[];

  sponsor_contribution: number | null;
  facility_contribution: number | null;

  clinic_split_percentage: number | null;
  van_split_percentage: number | null;
  surgeon_split_percentage: number | null;
  platform_split_percentage: number | null;

  notes: string | null;

  created_by: string | null;
  created_at: string;
  updated_at: string;
  deployed_at: string | null;
};

type MissionForm = {
  mission_name: string;
  region: string;
  district: string;

  priority_score: string;

  patient_count: string;
  ready_patient_count: string;
  cataract_count: string;
  pterygium_count: string;

  planned_start_date: string;
  planned_end_date: string;

  van_id: string;
  surgeon_name: string;
  clinical_team: string;

  facility_names: string;

  estimated_cost: string;
  expected_nhis_reimbursement: string;

  sponsor_contribution: string;
  facility_contribution: string;

  clinic_split_percentage: string;
  van_split_percentage: string;
  surgeon_split_percentage: string;
  platform_split_percentage: string;

  post_op_facility_confirmed: boolean;
  referral_pathway_confirmed: boolean;
  consumables_confirmed: boolean;
  facility_notifications_sent: boolean;

  equipment_confirmed: boolean;
  transport_confirmed: boolean;
  patient_notifications_sent: boolean;

  notes: string;
};

const emptyForm: MissionForm = {
  mission_name: "",
  region: "",
  district: "",

  priority_score: "",

  patient_count: "0",
  ready_patient_count: "0",
  cataract_count: "0",
  pterygium_count: "0",

  planned_start_date: "",
  planned_end_date: "",

  van_id: "",
  surgeon_name: "",
  clinical_team: "",

  facility_names: "",

  estimated_cost: "",
  expected_nhis_reimbursement: "",

  sponsor_contribution: "",
  facility_contribution: "",

  clinic_split_percentage: "",
  van_split_percentage: "",
  surgeon_split_percentage: "",
  platform_split_percentage: "",

  post_op_facility_confirmed: false,
  referral_pathway_confirmed: false,
  consumables_confirmed: false,
  facility_notifications_sent: false,

  equipment_confirmed: false,
  transport_confirmed: false,
  patient_notifications_sent: false,

  notes: "",
};

/* ========================================
   PAGE
======================================== */

export default function MissionsPage() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [missions, setMissions] = useState<
    Mission[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | MissionStatus>("all");

  const [builderOpen, setBuilderOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState<MissionForm>(emptyForm);

  const [selectedMission, setSelectedMission] =
    useState<Mission | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  /* ========================================
     LOAD
  ======================================== */

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

    const userId = session.user.id;

    setCurrentUserId(userId);

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

    if (
      profileData.role !== "coordinator" &&
      profileData.role !== "admin"
    ) {
      window.location.href = "/dashboard";
      return;
    }

    setProfile(profileData);

    await loadMissions();

    setLoading(false);
  }

  async function loadMissions() {
    const {
      data,
      error: missionError,
    } = await supabase
      .from("missions")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (missionError) {
      console.error(
        "MISSION LOAD ERROR:",
        missionError
      );

      setError(
        "Unable to load SurgiCare missions."
      );

      return;
    }

    setMissions(
      (data || []) as Mission[]
    );
  }

  /* ========================================
     SUMMARY
  ======================================== */

  const summary = useMemo(() => {
    return {
      total: missions.length,

      planning: missions.filter(
        (mission) =>
          mission.status === "planning"
      ).length,

      ready: missions.filter(
        (mission) =>
          mission.status === "ready"
      ).length,

      deployed: missions.filter(
        (mission) =>
          mission.status === "deployed"
      ).length,

      completed: missions.filter(
        (mission) =>
          mission.status === "completed"
      ).length,

      patients: missions.reduce(
        (total, mission) =>
          total +
          Number(
            mission.patient_count || 0
          ),
        0
      ),

      readyPatients: missions.reduce(
        (total, mission) =>
          total +
          Number(
            mission.ready_patient_count ||
              0
          ),
        0
      ),
    };
  }, [missions]);

  /* ========================================
     FILTER
  ======================================== */

  const filteredMissions =
    useMemo(() => {
      let result = [...missions];

      if (statusFilter !== "all") {
        result = result.filter(
          (mission) =>
            mission.status ===
            statusFilter
        );
      }

      const query =
        search.trim().toLowerCase();

      if (query) {
        result = result.filter(
          (mission) => {
            const values = [
              mission.mission_name,
              mission.region || "",
              mission.district || "",
              mission.surgeon_name || "",
              mission.van_id || "",
              ...(mission.facility_names ||
                []),
            ];

            return values.some((value) =>
              value
                .toLowerCase()
                .includes(query)
            );
          }
        );
      }

      return result;
    }, [
      missions,
      search,
      statusFilter,
    ]);

  /* ========================================
     FORM HELPERS
  ======================================== */

  function updateField(
    field: keyof MissionForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openBuilder() {
    setSelectedMission(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setBuilderOpen(true);
  }

  function editMission(
    mission: Mission
  ) {
    setSelectedMission(mission);

    setForm({
      mission_name:
        mission.mission_name || "",

      region:
        mission.region || "",

      district:
        mission.district || "",

      priority_score:
        mission.priority_score?.toString() ||
        "",

      patient_count:
        String(
          mission.patient_count || 0
        ),

      ready_patient_count:
        String(
          mission.ready_patient_count ||
            0
        ),

      cataract_count:
        String(
          mission.cataract_count || 0
        ),

      pterygium_count:
        String(
          mission.pterygium_count || 0
        ),

      planned_start_date:
        mission.planned_start_date ||
        "",

      planned_end_date:
        mission.planned_end_date ||
        "",

      van_id:
        mission.van_id || "",

      surgeon_name:
        mission.surgeon_name || "",

      clinical_team:
        (
          mission.clinical_team || []
        ).join(", "),

      facility_names:
        (
          mission.facility_names || []
        ).join(", "),

      estimated_cost:
        mission.estimated_cost?.toString() ||
        "",

      expected_nhis_reimbursement:
        mission.expected_nhis_reimbursement?.toString() ||
        "",

      sponsor_contribution:
        mission.sponsor_contribution?.toString() ||
        "",

      facility_contribution:
        mission.facility_contribution?.toString() ||
        "",

      clinic_split_percentage:
        mission.clinic_split_percentage?.toString() ||
        "",

      van_split_percentage:
        mission.van_split_percentage?.toString() ||
        "",

      surgeon_split_percentage:
        mission.surgeon_split_percentage?.toString() ||
        "",

      platform_split_percentage:
        mission.platform_split_percentage?.toString() ||
        "",

      post_op_facility_confirmed:
        mission.post_op_facility_confirmed,

      referral_pathway_confirmed:
        mission.referral_pathway_confirmed,

      consumables_confirmed:
        mission.consumables_confirmed,

      facility_notifications_sent:
        mission.facility_notifications_sent,

      equipment_confirmed:
        mission.equipment_confirmed,

      transport_confirmed:
        mission.transport_confirmed,

      patient_notifications_sent:
        mission.patient_notifications_sent,

      notes:
        mission.notes || "",
    });

    setError("");
    setSuccess("");
    setBuilderOpen(true);
  }

  /* ========================================
     READINESS
  ======================================== */

  const readinessCount =
    [
      form.post_op_facility_confirmed,
      form.referral_pathway_confirmed,
      form.consumables_confirmed,
      form.facility_notifications_sent,
      form.equipment_confirmed,
      form.transport_confirmed,
      form.patient_notifications_sent,
    ].filter(Boolean).length;

  const fullyReady =
    readinessCount === 7;

  /* ========================================
     SAVE MISSION
  ======================================== */

  async function saveMission(
    targetStatus: MissionStatus
  ) {
    if (!currentUserId) {
      setError(
        "Your SurgiCare session could not be verified."
      );
      return;
    }

    if (!form.mission_name.trim()) {
      setError(
        "Mission name is required."
      );
      return;
    }

    if (
      form.planned_start_date &&
      form.planned_end_date &&
      form.planned_end_date <
        form.planned_start_date
    ) {
      setError(
        "Mission end date cannot be before the start date."
      );
      return;
    }

    if (
      targetStatus === "deployed" &&
      !fullyReady
    ) {
      setError(
        "Complete all seven readiness checks before deploying this mission."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const clinicalTeam =
      form.clinical_team
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    const facilityNames =
      form.facility_names
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    const payload = {
      mission_name:
        form.mission_name.trim(),

      region:
        form.region.trim() || null,

      district:
        form.district.trim() || null,

      priority_score:
        nullableNumber(
          form.priority_score
        ),

      patient_count:
        safeInteger(
          form.patient_count
        ),

      ready_patient_count:
        safeInteger(
          form.ready_patient_count
        ),

      cataract_count:
        safeInteger(
          form.cataract_count
        ),

      pterygium_count:
        safeInteger(
          form.pterygium_count
        ),

      planned_start_date:
        form.planned_start_date ||
        null,

      planned_end_date:
        form.planned_end_date ||
        null,

      van_id:
        form.van_id.trim() || null,

      surgeon_name:
        form.surgeon_name.trim() ||
        null,

      clinical_team: clinicalTeam,

      facility_names: facilityNames,

      estimated_cost:
        nullableNumber(
          form.estimated_cost
        ),

      expected_nhis_reimbursement:
        nullableNumber(
          form.expected_nhis_reimbursement
        ),

      sponsor_contribution:
        nullableNumber(
          form.sponsor_contribution
        ) ?? 0,

      facility_contribution:
        nullableNumber(
          form.facility_contribution
        ) ?? 0,

      clinic_split_percentage:
        nullableNumber(
          form.clinic_split_percentage
        ),

      van_split_percentage:
        nullableNumber(
          form.van_split_percentage
        ),

      surgeon_split_percentage:
        nullableNumber(
          form.surgeon_split_percentage
        ),

      platform_split_percentage:
        nullableNumber(
          form.platform_split_percentage
        ),

      post_op_facility_confirmed:
        form.post_op_facility_confirmed,

      referral_pathway_confirmed:
        form.referral_pathway_confirmed,

      consumables_confirmed:
        form.consumables_confirmed,

      facility_notifications_sent:
        form.facility_notifications_sent,

      equipment_confirmed:
        form.equipment_confirmed,

      transport_confirmed:
        form.transport_confirmed,

      patient_notifications_sent:
        form.patient_notifications_sent,

      notes:
        form.notes.trim() || null,

      status: targetStatus,

      updated_at:
        new Date().toISOString(),

      deployed_at:
        targetStatus === "deployed"
          ? new Date().toISOString()
          : selectedMission
          ? selectedMission.deployed_at
          : null,
    };

    let missionId =
      selectedMission?.id || null;

    if (selectedMission) {
      const {
        error: updateError,
      } = await supabase
        .from("missions")
        .update(payload)
        .eq(
          "id",
          selectedMission.id
        );

      if (updateError) {
        console.error(
          "MISSION UPDATE ERROR:",
          updateError
        );

        setError(
          updateError.message ||
            "Unable to update mission."
        );

        setSaving(false);
        return;
      }
    } else {
      const {
        data,
        error: insertError,
      } = await supabase
        .from("missions")
        .insert({
          ...payload,
          created_by:
            currentUserId,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(
          "MISSION INSERT ERROR:",
          insertError
        );

        setError(
          insertError.message ||
            "Unable to create mission."
        );

        setSaving(false);
        return;
      }

      missionId = data.id;
    }

    /*
      Audit log failure does not prevent
      the mission itself from being saved.
    */

    const { error: auditError } =
      await supabase
        .from("audit_logs")
        .insert({
          user_id:
            currentUserId,

          action:
            targetStatus ===
            "deployed"
              ? "mission_deployed"
              : selectedMission
              ? "mission_updated"
              : "mission_created",

          entity_type:
            "mission",

          entity_id:
            missionId,

          details: {
            mission_name:
              form.mission_name.trim(),

            status:
              targetStatus,

            readiness:
              `${readinessCount}/7`,
          },
        });

    if (auditError) {
      console.error(
        "MISSION AUDIT ERROR:",
        auditError
      );
    }

    await loadMissions();

    setBuilderOpen(false);

    setSelectedMission(null);

    setForm(emptyForm);

    setSuccess(
      targetStatus === "deployed"
        ? "Mission deployed successfully."
        : selectedMission
        ? "Mission updated successfully."
        : "Mission created successfully."
    );

    setSaving(false);
  }

  /* ========================================
     STATUS CHANGE
  ======================================== */

  async function changeStatus(
    mission: Mission,
    status: MissionStatus
  ) {
    if (
      status === "deployed"
    ) {
      const ready =
        mission.post_op_facility_confirmed &&
        mission.referral_pathway_confirmed &&
        mission.consumables_confirmed &&
        mission.facility_notifications_sent &&
        mission.equipment_confirmed &&
        mission.transport_confirmed &&
        mission.patient_notifications_sent;

      if (!ready) {
        setError(
          "This mission cannot be deployed until all readiness checks are complete."
        );
        return;
      }
    }

    setError("");
    setSuccess("");

    const { error: updateError } =
      await supabase
        .from("missions")
        .update({
          status,

          updated_at:
            new Date().toISOString(),

          deployed_at:
            status === "deployed"
              ? mission.deployed_at ||
                new Date().toISOString()
              : mission.deployed_at,
        })
        .eq("id", mission.id);

    if (updateError) {
      console.error(updateError);

      setError(
        "Unable to update mission status."
      );

      return;
    }

    await loadMissions();

    setSuccess(
      `Mission moved to ${formatStatus(
        status
      )}.`
    );
  }

  /* ========================================
     LOGOUT
  ======================================== */

  async function logout() {
    await supabase.auth.signOut();

    window.location.href =
      "/login";
  }

  /* ========================================
     LOADING
  ======================================== */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Loading Mission Control...
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

  /* ========================================
     UI
  ======================================== */

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-[#dfe9e5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#087f6b] text-white">
              <MedicalCross />
            </div>

            <div>
              <h1 className="text-xl font-bold text-[#10233c]">
                SurgiCare
              </h1>

              <p className="text-xs font-medium text-[#087f6b]">
                Mission Control
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
                  "/coordinator";
              }}
              className="rounded-xl border border-[#b9ded3] bg-[#eef9f5] px-4 py-2 text-sm font-semibold text-[#087f6b] transition hover:bg-[#e6f6f0]"
            >
              Control Tower
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

            <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  Outreach Operations
                </span>

                <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Mission Control
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 md:text-base">
                  Welcome, {firstName}.
                  Convert reviewed outreach
                  opportunities into operational
                  surgical missions and track
                  readiness through deployment.
                </p>
              </div>

              <button
                type="button"
                onClick={openBuilder}
                className="shrink-0 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#087f6b] shadow-sm transition hover:bg-[#f4fffb]"
              >
                + Build Mission
              </button>
            </div>
          </div>
        </section>

        {/* MESSAGES */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-[#b9ded3] bg-[#eef9f5] px-5 py-4 text-sm font-semibold text-[#087f6b]">
            ✓ {success}
          </div>
        )}

        {/* METRICS */}

        <section className="mt-8">
          <p className="text-sm font-semibold text-[#087f6b]">
            Operations overview
          </p>

          <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
            Mission pipeline
          </h3>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <MetricCard
              label="All missions"
              value={summary.total}
            />

            <MetricCard
              label="Planning"
              value={summary.planning}
            />

            <MetricCard
              label="Ready"
              value={summary.ready}
              green
            />

            <MetricCard
              label="Deployed"
              value={summary.deployed}
              green
            />

            <MetricCard
              label="Completed"
              value={summary.completed}
            />

            <MetricCard
              label="Patients"
              value={summary.patients}
            />

            <MetricCard
              label="Ready patients"
              value={summary.readyPatients}
              green
            />
          </div>
        </section>

        {/* MISSIONS */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#dfe9e5] bg-white">
          <div className="border-b border-[#e5eeea] p-6 md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#087f6b]">
                  Mission Control
                </p>

                <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
                  Outreach missions
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#65756f]">
                  Review mission demand,
                  clinical assignments,
                  operational readiness and
                  deployment status.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    "/coordinator/recommendations";
                }}
                className="rounded-xl border border-[#b9ded3] bg-[#eef9f5] px-5 py-3 text-sm font-semibold text-[#087f6b] transition hover:bg-[#e6f6f0]"
              >
                Recommendation Engine →
              </button>
            </div>
          </div>

          {/* FILTERS */}

          <div className="border-b border-[#e5eeea] p-6 md:p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search mission, district, region, surgeon or facility..."
                className={`${inputClass} xl:max-w-md`}
              />

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "all",
                    "planning",
                    "ready",
                    "deployed",
                    "completed",
                    "cancelled",
                  ] as const
                ).map((status) => (
                  <FilterButton
                    key={status}
                    label={
                      status === "all"
                        ? "All"
                        : formatStatus(
                            status
                          )
                    }
                    active={
                      statusFilter ===
                      status
                    }
                    onClick={() =>
                      setStatusFilter(
                        status
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          {/* LIST */}

          <div className="p-6 md:p-8">
            {filteredMissions.length ===
            0 ? (
              <div className="py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f6f1] text-2xl text-[#087f6b]">
                  +
                </div>

                <h4 className="mt-4 text-xl font-bold text-[#10233c]">
                  No missions found
                </h4>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#65756f]">
                  Create a mission manually or
                  move a reviewed outreach
                  recommendation into mission
                  planning.
                </p>

                <button
                  type="button"
                  onClick={openBuilder}
                  className="mt-5 rounded-xl bg-[#087f6b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#056554]"
                >
                  Build First Mission
                </button>
              </div>
            ) : (
              <div className="grid gap-5">
                {filteredMissions.map(
                  (mission) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      onEdit={() =>
                        editMission(
                          mission
                        )
                      }
                      onStatusChange={(
                        status
                      ) =>
                        changeStatus(
                          mission,
                          status
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* HUMAN CONTROL */}

        <section className="mt-6 rounded-2xl border border-[#dfe9e5] bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f6f1] text-[#087f6b]">
              ✓
            </div>

            <div>
              <p className="text-sm font-semibold text-[#10233c]">
                Coordinator-controlled deployment
              </p>

              <p className="mt-1 text-sm leading-6 text-[#65756f]">
                Recommendations can support
                mission planning, but deployment
                remains a deliberate coordinator
                action after operational
                readiness has been reviewed.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* =====================================
          BUILDER
      ====================================== */}

      {builderOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#071d18]/60 p-4 backdrop-blur-sm md:p-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#f6faf8] shadow-2xl">
            {/* BUILDER HEADER */}

            <div className="bg-[#087f6b] px-6 py-7 text-white md:px-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
                    SurgiCare Operations
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    {selectedMission
                      ? "Edit Mission"
                      : "Mission Builder"}
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50">
                    Configure outreach demand,
                    clinical resources,
                    readiness and financial
                    planning before deployment.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setBuilderOpen(false)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-6 p-5 md:p-8">
              {/* IDENTITY */}

              <BuilderSection
                number="01"
                title="Mission identity"
                description="Define where and why this outreach mission will operate."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Mission name"
                    required
                  >
                    <input
                      value={
                        form.mission_name
                      }
                      onChange={(e) =>
                        updateField(
                          "mission_name",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Eastern Cataract Outreach"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Priority score">
                    <input
                      type="number"
                      value={
                        form.priority_score
                      }
                      onChange={(e) =>
                        updateField(
                          "priority_score",
                          e.target.value
                        )
                      }
                      placeholder="e.g. 87"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Region">
                    <input
                      value={form.region}
                      onChange={(e) =>
                        updateField(
                          "region",
                          e.target.value
                        )
                      }
                      placeholder="Region"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="District">
                    <input
                      value={form.district}
                      onChange={(e) =>
                        updateField(
                          "district",
                          e.target.value
                        )
                      }
                      placeholder="District"
                      className={inputClass}
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Facilities">
                      <input
                        value={
                          form.facility_names
                        }
                        onChange={(e) =>
                          updateField(
                            "facility_names",
                            e.target.value
                          )
                        }
                        placeholder="Facility A, Facility B, Facility C"
                        className={inputClass}
                      />

                      <p className="mt-2 text-xs text-[#7a8984]">
                        Separate multiple
                        facilities with commas.
                      </p>
                    </Field>
                  </div>
                </div>
              </BuilderSection>

              {/* DEMAND */}

              <BuilderSection
                number="02"
                title="Outreach demand"
                description="Capture the patient population this mission is expected to serve."
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <NumberField
                    label="Patients"
                    value={
                      form.patient_count
                    }
                    onChange={(value) =>
                      updateField(
                        "patient_count",
                        value
                      )
                    }
                  />

                  <NumberField
                    label="Ready now"
                    value={
                      form.ready_patient_count
                    }
                    onChange={(value) =>
                      updateField(
                        "ready_patient_count",
                        value
                      )
                    }
                  />

                  <NumberField
                    label="Cataract"
                    value={
                      form.cataract_count
                    }
                    onChange={(value) =>
                      updateField(
                        "cataract_count",
                        value
                      )
                    }
                  />

                  <NumberField
                    label="Pterygium"
                    value={
                      form.pterygium_count
                    }
                    onChange={(value) =>
                      updateField(
                        "pterygium_count",
                        value
                      )
                    }
                  />
                </div>
              </BuilderSection>

              {/* SCHEDULE */}

              <BuilderSection
                number="03"
                title="Mission schedule"
                description="Set the proposed operating window."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Planned start date">
                    <input
                      type="date"
                      value={
                        form.planned_start_date
                      }
                      onChange={(e) =>
                        updateField(
                          "planned_start_date",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Planned end date">
                    <input
                      type="date"
                      value={
                        form.planned_end_date
                      }
                      onChange={(e) =>
                        updateField(
                          "planned_end_date",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              </BuilderSection>

              {/* CLINICAL */}

              <BuilderSection
                number="04"
                title="Clinical operations"
                description="Assign the people and mobile resources responsible for delivery."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Lead surgeon">
                    <input
                      value={
                        form.surgeon_name
                      }
                      onChange={(e) =>
                        updateField(
                          "surgeon_name",
                          e.target.value
                        )
                      }
                      placeholder="Surgeon name"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Mobile unit / van">
                    <input
                      value={form.van_id}
                      onChange={(e) =>
                        updateField(
                          "van_id",
                          e.target.value
                        )
                      }
                      placeholder="e.g. SC-VAN-01"
                      className={inputClass}
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Clinical team">
                      <input
                        value={
                          form.clinical_team
                        }
                        onChange={(e) =>
                          updateField(
                            "clinical_team",
                            e.target.value
                          )
                        }
                        placeholder="Nurse Ama, Dr. Mensah, Technician Kojo"
                        className={inputClass}
                      />

                      <p className="mt-2 text-xs text-[#7a8984]">
                        Separate team members
                        with commas.
                      </p>
                    </Field>
                  </div>
                </div>
              </BuilderSection>

              {/* READINESS */}

              <BuilderSection
                number="05"
                title="Operational readiness"
                description="Deployment is unlocked only when every readiness item has been confirmed."
              >
                <div className="mb-5 rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#10233c]">
                        Readiness
                      </p>

                      <p className="mt-1 text-xs text-[#65756f]">
                        {readinessCount} of 7
                        operational checks
                        confirmed
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#087f6b]">
                      {Math.round(
                        (readinessCount /
                          7) *
                          100
                      )}
                      %
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#d4ebe4]">
                    <div
                      className="h-full rounded-full bg-[#087f6b] transition-all"
                      style={{
                        width: `${
                          (readinessCount /
                            7) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <ReadinessCheck
                    label="Post-op facility confirmed"
                    checked={
                      form.post_op_facility_confirmed
                    }
                    onChange={(value) =>
                      updateField(
                        "post_op_facility_confirmed",
                        value
                      )
                    }
                  />

                  <ReadinessCheck
                    label="Referral pathway confirmed"
                    checked={
                      form.referral_pathway_confirmed
                    }
                    onChange={(value) =>
                      updateField(
                        "referral_pathway_confirmed",
                        value
                      )
                    }
                  />

                  <ReadinessCheck
                    label="Consumables confirmed"
                    checked={
                      form.consumables_confirmed
                    }
                    onChange={(value) =>
                      updateField(
                        "consumables_confirmed",
                        value
                      )
                    }
                  />

                  <ReadinessCheck
                    label="Equipment confirmed"
                    checked={
                      form.equipment_confirmed
                    }
                    onChange={(value) =>
                      updateField(
                        "equipment_confirmed",
                        value
                      )
                    }
                  />

                  <ReadinessCheck
                    label="Transport confirmed"
                    checked={
                      form.transport_confirmed
                    }
                    onChange={(value) =>
                      updateField(
                        "transport_confirmed",
                        value
                      )
                    }
                  />

                  <ReadinessCheck
                    label="Facility notifications sent"
                    checked={
                      form.facility_notifications_sent
                    }
                    onChange={(value) =>
                      updateField(
                        "facility_notifications_sent",
                        value
                      )
                    }
                  />

                  <ReadinessCheck
                    label="Patient notifications sent"
                    checked={
                      form.patient_notifications_sent
                    }
                    onChange={(value) =>
                      updateField(
                        "patient_notifications_sent",
                        value
                      )
                    }
                  />
                </div>
              </BuilderSection>

              {/* FINANCE */}

              <BuilderSection
                number="06"
                title="Financial model"
                description="Capture estimated mission cost, expected reimbursement and allocation assumptions."
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <MoneyField
                    label="Estimated cost"
                    value={
                      form.estimated_cost
                    }
                    onChange={(value) =>
                      updateField(
                        "estimated_cost",
                        value
                      )
                    }
                  />

                  <MoneyField
                    label="Expected NHIS reimbursement"
                    value={
                      form.expected_nhis_reimbursement
                    }
                    onChange={(value) =>
                      updateField(
                        "expected_nhis_reimbursement",
                        value
                      )
                    }
                  />

                  <MoneyField
                    label="Sponsor contribution"
                    value={
                      form.sponsor_contribution
                    }
                    onChange={(value) =>
                      updateField(
                        "sponsor_contribution",
                        value
                      )
                    }
                  />

                  <MoneyField
                    label="Facility contribution"
                    value={
                      form.facility_contribution
                    }
                    onChange={(value) =>
                      updateField(
                        "facility_contribution",
                        value
                      )
                    }
                  />
                </div>

                <div className="mt-6 border-t border-[#e5eeea] pt-6">
                  <p className="mb-4 text-sm font-bold text-[#10233c]">
                    Revenue split
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <PercentageField
                      label="Clinic"
                      value={
                        form.clinic_split_percentage
                      }
                      onChange={(value) =>
                        updateField(
                          "clinic_split_percentage",
                          value
                        )
                      }
                    />

                    <PercentageField
                      label="Van"
                      value={
                        form.van_split_percentage
                      }
                      onChange={(value) =>
                        updateField(
                          "van_split_percentage",
                          value
                        )
                      }
                    />

                    <PercentageField
                      label="Surgeon"
                      value={
                        form.surgeon_split_percentage
                      }
                      onChange={(value) =>
                        updateField(
                          "surgeon_split_percentage",
                          value
                        )
                      }
                    />

                    <PercentageField
                      label="Platform"
                      value={
                        form.platform_split_percentage
                      }
                      onChange={(value) =>
                        updateField(
                          "platform_split_percentage",
                          value
                        )
                      }
                    />
                  </div>

                  <SplitSummary
                    form={form}
                  />
                </div>
              </BuilderSection>

              {/* NOTES */}

              <BuilderSection
                number="07"
                title="Mission notes"
                description="Record operational context, constraints or coordinator instructions."
              >
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    updateField(
                      "notes",
                      e.target.value
                    )
                  }
                  rows={5}
                  placeholder="Add mission notes..."
                  className={`${inputClass} resize-none`}
                />
              </BuilderSection>

              {/* BUILDER ERROR */}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* ACTIONS */}

              <div className="flex flex-col gap-3 border-t border-[#dfe9e5] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setBuilderOpen(false)
                  }
                  className="rounded-xl border border-[#dfe9e5] bg-white px-5 py-3 text-sm font-semibold text-[#52635d] transition hover:bg-[#f6faf8]"
                >
                  Cancel
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      saveMission(
                        fullyReady
                          ? "ready"
                          : "planning"
                      )
                    }
                    className="rounded-xl border border-[#b9ded3] bg-[#eef9f5] px-5 py-3 text-sm font-semibold text-[#087f6b] transition hover:bg-[#e6f6f0] disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : selectedMission
                      ? "Save Changes"
                      : "Save Mission"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving ||
                      !fullyReady
                    }
                    onClick={() =>
                      saveMission(
                        "deployed"
                      )
                    }
                    className="rounded-xl bg-[#087f6b] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#056554] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {fullyReady
                      ? "Deploy Mission →"
                      : `Deployment Locked (${readinessCount}/7)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ========================================
   MISSION CARD
======================================== */

function MissionCard({
  mission,
  onEdit,
  onStatusChange,
}: {
  mission: Mission;
  onEdit: () => void;
  onStatusChange: (
    status: MissionStatus
  ) => void;
}) {
  const readiness =
    [
      mission.post_op_facility_confirmed,
      mission.referral_pathway_confirmed,
      mission.consumables_confirmed,
      mission.facility_notifications_sent,
      mission.equipment_confirmed,
      mission.transport_confirmed,
      mission.patient_notifications_sent,
    ].filter(Boolean).length;

  const ready =
    readiness === 7;

  return (
    <article className="rounded-2xl border border-[#dfe9e5] bg-[#fbfdfc] p-5 md:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="text-xl font-bold text-[#10233c]">
              {mission.mission_name}
            </h4>

            <StatusBadge
              status={mission.status}
            />

            {mission.priority_score !==
              null && (
              <span className="rounded-full bg-[#eef2f8] px-3 py-1 text-xs font-semibold text-[#52635d]">
                Priority{" "}
                {mission.priority_score}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm font-medium text-[#087f6b]">
            {[
              mission.district,
              mission.region,
            ]
              .filter(Boolean)
              .join(", ") ||
              "Location not assigned"}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Schedule"
              value={formatDateRange(
                mission.planned_start_date,
                mission.planned_end_date
              )}
            />

            <Info
              label="Lead surgeon"
              value={
                mission.surgeon_name ||
                "Not assigned"
              }
            />

            <Info
              label="Mobile unit"
              value={
                mission.van_id ||
                "Not assigned"
              }
            />

            <Info
              label="Readiness"
              value={`${readiness}/7 confirmed`}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <MiniMetric
              label="Patients"
              value={
                mission.patient_count
              }
            />

            <MiniMetric
              label="Ready"
              value={
                mission.ready_patient_count
              }
              green
            />

            <MiniMetric
              label="Cataract"
              value={
                mission.cataract_count
              }
            />

            <MiniMetric
              label="Pterygium"
              value={
                mission.pterygium_count
              }
            />
          </div>

          {mission.facility_names &&
            mission.facility_names.length >
              0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {mission.facility_names.map(
                  (facility) => (
                    <span
                      key={facility}
                      className="rounded-full border border-[#dfe9e5] bg-white px-3 py-1.5 text-xs font-medium text-[#52635d]"
                    >
                      {facility}
                    </span>
                  )
                )}
              </div>
            )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 xl:w-48 xl:flex-col">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-xl border border-[#b9ded3] bg-[#eef9f5] px-4 py-3 text-sm font-semibold text-[#087f6b] transition hover:bg-[#e6f6f0]"
          >
            Open Mission
          </button>

          {mission.status ===
            "planning" &&
            ready && (
              <button
                type="button"
                onClick={() =>
                  onStatusChange(
                    "ready"
                  )
                }
                className="flex-1 rounded-xl bg-[#10233c] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1b3655]"
              >
                Mark Ready
              </button>
            )}

          {(mission.status ===
            "planning" ||
            mission.status ===
              "ready") && (
            <button
              type="button"
              disabled={!ready}
              onClick={() =>
                onStatusChange(
                  "deployed"
                )
              }
              className="flex-1 rounded-xl bg-[#087f6b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#056554] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Deploy
            </button>
          )}

          {mission.status ===
            "deployed" && (
            <>
              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    `/missions/${mission.id}/operations`;
                }}
                className="flex-1 rounded-xl bg-[#087f6b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#056554]"
              >
                Open Operations →
              </button>

              <button
                type="button"
                onClick={() =>
                  onStatusChange(
                    "completed"
                  )
                }
                className="flex-1 rounded-xl bg-[#10233c] px-4 py-3 text-sm font-semibold text-white"
              >
                Complete Mission
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/* ========================================
   COMPONENTS
======================================== */

function BuilderSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#dfe9e5] bg-white p-5 md:p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f6f1] text-sm font-bold text-[#087f6b]">
          {number}
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#10233c]">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-[#65756f]">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#10233c]">
        {label}
        {required && (
          <span className="text-red-500">
            {" "}
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className={inputClass}
      />
    </Field>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <span className="absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-[#65756f]">
          GH₵
        </span>

        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder="0.00"
          className={`${inputClass} pl-14`}
        />
      </div>
    </Field>
  );
}

function PercentageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder="0"
          className={`${inputClass} pr-10`}
        />

        <span className="absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[#65756f]">
          %
        </span>
      </div>
    </Field>
  );
}

function ReadinessCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
        checked
          ? "border-[#9bd5c5] bg-[#eef9f5]"
          : "border-[#dfe9e5] bg-white hover:bg-[#fbfdfc]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
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
        {label}
      </span>
    </label>
  );
}

function SplitSummary({
  form,
}: {
  form: MissionForm;
}) {
  const total =
    safeNumber(
      form.clinic_split_percentage
    ) +
    safeNumber(
      form.van_split_percentage
    ) +
    safeNumber(
      form.surgeon_split_percentage
    ) +
    safeNumber(
      form.platform_split_percentage
    );

  const valid =
    Math.abs(total - 100) <
    0.001;

  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
        valid
          ? "border-[#b9ded3] bg-[#eef9f5] text-[#087f6b]"
          : "border-[#eadfb7] bg-[#fffaf0] text-[#8a6a12]"
      }`}
    >
      Revenue allocation:{" "}
      <strong>
        {total.toFixed(2)}%
      </strong>

      {valid
        ? " — allocation balanced."
        : " — target is 100%."}
    </div>
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

function MiniMetric({
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
      className={`rounded-xl px-4 py-3 ${
        green
          ? "bg-[#e7f6f1]"
          : "bg-white"
      }`}
    >
      <p
        className={`text-xs ${
          green
            ? "text-[#087f6b]"
            : "text-[#65756f]"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-bold ${
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

function StatusBadge({
  status,
}: {
  status: MissionStatus;
}) {
  const styles: Record<
    MissionStatus,
    string
  > = {
    planning:
      "bg-[#fff7df] text-[#946900]",

    ready:
      "bg-[#e7f6f1] text-[#087f6b]",

    deployed:
      "bg-[#e8f0ff] text-[#315b9a]",

    completed:
      "bg-[#eef2f8] text-[#40546d]",

    cancelled:
      "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {formatStatus(status)}
    </span>
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

function MedicalCross() {
  return (
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
  );
}

/* ========================================
   HELPERS
======================================== */

function safeInteger(
  value: string
) {
  const parsed =
    Number.parseInt(value, 10);

  if (
    Number.isNaN(parsed) ||
    parsed < 0
  ) {
    return 0;
  }

  return parsed;
}

function safeNumber(
  value: string
) {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function nullableNumber(
  value: string
) {
  if (!value.trim()) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function formatStatus(
  status: string
) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDateRange(
  start: string | null,
  end: string | null
) {
  if (!start && !end) {
    return "Not scheduled";
  }

  if (start && !end) {
    return formatDate(start);
  }

  if (!start && end) {
    return formatDate(end);
  }

  return `${formatDate(
    start!
  )} – ${formatDate(end!)}`;
}

function formatDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const inputClass =
  "w-full rounded-xl border border-[#dfe9e5] bg-white px-4 py-3.5 text-sm text-[#10231f] outline-none transition placeholder:text-slate-400 focus:border-[#087f6b] focus:ring-4 focus:ring-[#087f6b]/10";