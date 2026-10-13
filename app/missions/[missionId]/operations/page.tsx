"use client";

import {
  use,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Mission = {
  id: string;
  mission_name: string;
  status: string;
  region: string | null;
  district: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  surgeon_name: string | null;
  van_id: string | null;
  facility_names: string[] | null;
};

type PostOpFollowup = {
  id: string;
  mission_patient_id: string;

  followup_type:
    | "day_1"
    | "week_1"
    | "month_1";

  status:
    | "due"
    | "completed"
    | "missed"
    | "referred";

  scheduled_date: string | null;
  completed_at: string | null;

  visual_acuity: string | null;

  complication_present: boolean;
  complication_notes: string | null;

  referral_required: boolean;
  referral_notes: string | null;

  clinical_notes: string | null;
};

type MissionPatient = {
  id: string;
  mission_id: string;
  patient_id: string;
  facility_id: string | null;

  status:
    | "scheduled"
    | "checked_in"
    | "no_show"
    | "cancelled"
    | "completed";

  procedure_type: string | null;
  procedure_eye: string | null;

  procedure_status:
    | "pending"
    | "cleared"
    | "in_progress"
    | "completed"
    | "cancelled";

  checked_in_at: string | null;
  procedure_started_at: string | null;
  procedure_completed_at: string | null;

  outcome: string | null;
  clinical_notes: string | null;

  followups?: PostOpFollowup[];

  patient: {
    full_name: string;
    age: number | null;
    sex: string | null;
    phone_patient: string | null;
  } | null;

  facility: {
    name: string;
  } | null;
};

export default function MissionOperationsPage({
  params,
}: {
  params: Promise<{
    missionId: string;
  }>;
}) {
  const { missionId } = use(params);

  const [mission, setMission] =
    useState<Mission | null>(null);

  const [patients, setPatients] =
    useState<MissionPatient[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadOperations();
  }, [missionId]);

  async function loadOperations() {
    setLoading(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/";
      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      console.error(profileError);
      setError(
        "Your SurgiCare access could not be verified."
      );
      setLoading(false);
      return;
    }

    if (
      !profile ||
      !["admin", "coordinator"].includes(
        profile.role
      )
    ) {
      window.location.href = "/dashboard";
      return;
    }

    const {
      data: missionData,
      error: missionError,
    } = await supabase
      .from("missions")
      .select(`
        id,
        mission_name,
        status,
        region,
        district,
        planned_start_date,
        planned_end_date,
        surgeon_name,
        van_id,
        facility_names
      `)
      .eq("id", missionId)
      .maybeSingle();

    if (
      missionError ||
      !missionData
    ) {
      console.error(missionError);
      setError(
        "Mission could not be found."
      );
      setLoading(false);
      return;
    }

    setMission(
      missionData as Mission
    );

    const {
      data: rosterData,
      error: rosterError,
    } = await supabase
      .from("mission_patients")
      .select(`
        id,
        mission_id,
        patient_id,
        facility_id,
        status,
        procedure_type,
        procedure_eye,
        procedure_status,
        checked_in_at,
        procedure_started_at,
        procedure_completed_at,
        outcome,
        clinical_notes,
        followups:post_op_followups (
          id,
          mission_patient_id,
          followup_type,
          status,
          scheduled_date,
          completed_at,
          visual_acuity,
          complication_present,
          complication_notes,
          referral_required,
          referral_notes,
          clinical_notes
        ),
        patient:patients (
          full_name,
          age,
          sex,
          phone_patient
        ),
        facility:facilities (
          name
        )
      `)
      .eq("mission_id", missionId)
      .order("created_at", {
        ascending: true,
      });

    if (rosterError) {
      console.error(rosterError);
      setError(
        "Mission roster could not be loaded."
      );
      setLoading(false);
      return;
    }

    setPatients(
      (rosterData || []) as unknown as MissionPatient[]
    );

    setLoading(false);
  }

  async function updatePatient(
    patient: MissionPatient,
    action:
      | "check_in"
      | "clear"
      | "start"
      | "complete"
      | "no_show"
  ) {
    setUpdatingId(patient.id);
    setError("");
    setMessage("");

    const now =
      new Date().toISOString();

    let payload:
      Record<string, unknown> = {};

    if (action === "check_in") {
      payload = {
        status: "checked_in",
        checked_in_at: now,
      };
    }

    if (action === "clear") {
      payload = {
        procedure_status:
          "cleared",
      };
    }

    if (action === "start") {
      payload = {
        procedure_status:
          "in_progress",
        procedure_started_at:
          now,
      };
    }

    if (action === "complete") {
      const outcome =
        window.prompt(
          "Record procedure outcome:",
          "Procedure completed successfully"
        );

      if (outcome === null) {
        setUpdatingId(null);
        return;
      }

      const notes =
        window.prompt(
          "Optional clinical notes:",
          ""
        );

      if (notes === null) {
        setUpdatingId(null);
        return;
      }

      payload = {
        status: "completed",
        procedure_status:
          "completed",
        procedure_completed_at:
          now,
        outcome:
          outcome.trim() ||
          "Procedure completed",
        clinical_notes:
          notes.trim() || null,
      };
    }

    if (action === "no_show") {
      const confirmed =
        window.confirm(
          `Mark ${
            patient.patient?.full_name ||
            "this patient"
          } as a no-show?`
        );

      if (!confirmed) {
        setUpdatingId(null);
        return;
      }

      payload = {
        status: "no_show",
      };
    }

    const {
      error: updateError,
    } = await supabase
      .from("mission_patients")
      .update({
        ...payload,
        updated_at: now,
      })
      .eq("id", patient.id)
      .eq("mission_id", missionId);

    if (updateError) {
      console.error(updateError);

      setError(
        updateError.message ||
          "Patient operation could not be updated."
      );

      setUpdatingId(null);
      return;
    }

    /*
      Keep the main patient record aware
      that surgery has occurred.
    */
    if (action === "complete") {
      const {
        error: patientError,
      } = await supabase
        .from("patients")
        .update({
          operated_at: now,
          booking_status:
            "operated",
        })
        .eq(
          "id",
          patient.patient_id
        );

      if (patientError) {
        console.error(
          "Patient completion sync error:",
          patientError
        );
      }
    }

    setMessage(
      action === "check_in"
        ? "Patient checked in."
        : action === "clear"
        ? "Patient cleared for procedure."
        : action === "start"
        ? "Procedure started."
        : action === "complete"
        ? "Procedure completed and outcome recorded."
        : "Patient marked as no-show."
    );

    await loadOperations();

    setUpdatingId(null);
  }

  const metrics = useMemo(() => {
    return {
      total: patients.length,

      checkedIn:
        patients.filter(
          (patient) =>
            patient.status ===
              "checked_in" &&
            patient.procedure_status !==
              "completed"
        ).length,

      inProgress:
        patients.filter(
          (patient) =>
            patient.procedure_status ===
            "in_progress"
        ).length,

      completed:
        patients.filter(
          (patient) =>
            patient.status ===
            "completed"
        ).length,

      noShow:
        patients.filter(
          (patient) =>
            patient.status ===
            "no_show"
        ).length,
    };
  }, [patients]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Loading mission operations...
          </p>
        </div>
      </main>
    );
  }

  if (!mission) {
    return (
      <main className="min-h-screen bg-[#f6faf8] px-5 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8">
          <h1 className="text-xl font-bold text-[#10233c]">
            Mission unavailable
          </h1>

          <p className="mt-3 text-sm text-red-700">
            {error ||
              "This mission could not be loaded."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      <header className="border-b border-[#dfe9e5] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/missions")
            }
            className="text-sm font-semibold text-[#087f6b]"
          >
            ← Mission Control
          </button>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-[#10233c] md:text-3xl">
                  {mission.mission_name}
                </h1>

                <span className="rounded-full bg-[#e8f0ff] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#315b9a]">
                  {mission.status}
                </span>
              </div>

              <p className="mt-2 text-sm font-medium text-[#65756f]">
                {[
                  mission.district,
                  mission.region,
                ]
                  .filter(Boolean)
                  .join(", ") ||
                  "Mission location"}
              </p>
            </div>

            <div className="text-sm text-[#65756f]">
              <p>
                <strong className="text-[#10233c]">
                  Surgeon:
                </strong>{" "}
                {mission.surgeon_name ||
                  "Not assigned"}
              </p>

              <p className="mt-1">
                <strong className="text-[#10233c]">
                  Mobile unit:
                </strong>{" "}
                {mission.van_id ||
                  "Not assigned"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-4 text-sm font-medium text-[#08705f]">
            ✓ {message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Scheduled"
            value={metrics.total}
          />

          <Metric
            label="Checked In"
            value={metrics.checkedIn}
          />

          <Metric
            label="In Procedure"
            value={metrics.inProgress}
          />

          <Metric
            label="Completed"
            value={metrics.completed}
          />

          <Metric
            label="No-show"
            value={metrics.noShow}
          />
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#087f6b]">
                Live operations
              </p>

              <h2 className="mt-1 text-2xl font-bold text-[#10233c]">
                Patient Roster
              </h2>
            </div>

            <p className="text-sm text-[#65756f]">
              {patients.length} patient
              {patients.length === 1
                ? ""
                : "s"}{" "}
              assigned
            </p>
          </div>

          {patients.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-[#dfe9e5] bg-white p-8 text-center">
              <h3 className="font-bold text-[#10233c]">
                No patients assigned
              </h3>

              <p className="mt-2 text-sm text-[#65756f]">
                Populate this mission's
                eligible patient roster
                before starting operations.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {patients.map(
                (patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    updating={
                      updatingId ===
                      patient.id
                    }
                    onAction={(action) =>
                      updatePatient(
                        patient,
                        action
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PatientCard({
  patient,
  updating,
  onAction,
}: {
  patient: MissionPatient;
  updating: boolean;
  onAction: (
    action:
      | "check_in"
      | "clear"
      | "start"
      | "complete"
      | "no_show"
  ) => void;
}) {
  const eye =
    patient.procedure_eye === "RE"
      ? "Right Eye"
      : patient.procedure_eye === "LE"
      ? "Left Eye"
      : patient.procedure_eye ||
        "Eye not specified";

  const finished =
    patient.status === "completed";

  const noShow =
    patient.status === "no_show";

  return (
    <article className="rounded-3xl border border-[#dfe9e5] bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold text-[#10233c]">
              {patient.patient
                ?.full_name ||
                "Patient"}
            </h3>

            <StatusPill
              status={
                finished
                  ? "Completed"
                  : noShow
                  ? "No-show"
                  : patient.procedure_status ===
                    "in_progress"
                  ? "In Procedure"
                  : patient.procedure_status ===
                    "cleared"
                  ? "Cleared"
                  : patient.status ===
                    "checked_in"
                  ? "Checked In"
                  : "Scheduled"
              }
            />
          </div>

          <p className="mt-2 text-sm font-medium text-[#087f6b]">
            {patient.facility?.name ||
              "Facility not listed"}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#65756f]">
            <span>
              <strong className="text-[#10233c]">
                Procedure:
              </strong>{" "}
              {patient.procedure_type ||
                "Not specified"}
            </span>

            <span>
              <strong className="text-[#10233c]">
                Eye:
              </strong>{" "}
              {eye}
            </span>

            {patient.patient?.age !==
              null &&
              patient.patient?.age !==
                undefined && (
                <span>
                  <strong className="text-[#10233c]">
                    Age:
                  </strong>{" "}
                  {patient.patient.age}
                </span>
              )}
          </div>

          {patient.outcome && (
            <div className="mt-4 rounded-xl bg-[#eef9f5] p-3 text-sm text-[#08705f]">
              <strong>
                Outcome:
              </strong>{" "}
              {patient.outcome}
            </div>
          )}

          {patient.clinical_notes && (
            <p className="mt-3 text-sm leading-6 text-[#65756f]">
              <strong className="text-[#10233c]">
                Notes:
              </strong>{" "}
              {patient.clinical_notes}
            </p>
          )}

          {finished &&
            patient.followups &&
            patient.followups.length > 0 && (
              <div className="mt-6 border-t border-[#dfe9e5] pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#087f6b]">
                  Post-Op Follow-Up
                </p>

                <div className="mt-3 space-y-3">
                  {[...patient.followups]
                    .sort((a, b) =>
                      (a.scheduled_date || "").localeCompare(
                        b.scheduled_date || ""
                      )
                    )
                    .map((followup) => (
                      <FollowupRow
                        key={followup.id}
                        followup={followup}
                        disabled={updating}
                        onSaved={() => {
                          window.location.reload();
                        }}
                      />
                    ))}
                </div>
              </div>
            )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-sm lg:justify-end">
          {patient.status ===
            "scheduled" && (
            <>
              <ActionButton
                disabled={updating}
                onClick={() =>
                  onAction("check_in")
                }
                primary
              >
                Check In
              </ActionButton>

              <ActionButton
                disabled={updating}
                onClick={() =>
                  onAction("no_show")
                }
              >
                No-show
              </ActionButton>
            </>
          )}

          {patient.status ===
            "checked_in" &&
            patient.procedure_status ===
              "pending" && (
              <ActionButton
                disabled={updating}
                onClick={() =>
                  onAction("clear")
                }
                primary
              >
                Clear for Procedure
              </ActionButton>
            )}

          {patient.status ===
            "checked_in" &&
            patient.procedure_status ===
              "cleared" && (
              <ActionButton
                disabled={updating}
                onClick={() =>
                  onAction("start")
                }
                primary
              >
                Start Procedure
              </ActionButton>
            )}

          {patient.procedure_status ===
            "in_progress" && (
            <ActionButton
              disabled={updating}
              onClick={() =>
                onAction("complete")
              }
              primary
            >
              Complete Procedure
            </ActionButton>
          )}

          {updating && (
            <span className="self-center px-2 text-xs font-semibold text-[#65756f]">
              Updating...
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function FollowupRow({
  followup,
  disabled,
  onSaved,
}: {
  followup: PostOpFollowup;
  disabled: boolean;
  onSaved: () => void;
}) {
  const [saving, setSaving] =
    useState(false);

  function followupLabel() {
    if (
      followup.followup_type ===
      "day_1"
    ) {
      return "Day 1";
    }

    if (
      followup.followup_type ===
      "week_1"
    ) {
      return "Week 1";
    }

    return "Month 1";
  }

  async function recordFollowup() {
    const visualAcuity =
      window.prompt(
        `${followupLabel()} visual acuity:`,
        followup.visual_acuity || ""
      );

    if (visualAcuity === null) {
      return;
    }

    if (!visualAcuity.trim()) {
      window.alert(
        "Visual acuity is required."
      );
      return;
    }

    const complicationPresent =
      window.confirm(
        "Is a post-operative complication present?"
      );

    let complicationNotes:
      string | null = null;

    if (complicationPresent) {
      const value =
        window.prompt(
          "Describe the complication:"
        );

      if (value === null) {
        return;
      }

      complicationNotes =
        value.trim() || null;
    }

    const referralRequired =
      window.confirm(
        "Does this patient require referral?"
      );

    let referralNotes:
      string | null = null;

    if (referralRequired) {
      const value =
        window.prompt(
          "Enter referral details:"
        );

      if (value === null) {
        return;
      }

      referralNotes =
        value.trim() || null;
    }

    const notes =
      window.prompt(
        "Optional follow-up clinical notes:",
        followup.clinical_notes || ""
      );

    if (notes === null) {
      return;
    }

    setSaving(true);

    const {
      error,
    } = await supabase
      .from("post_op_followups")
      .update({
        visual_acuity:
          visualAcuity.trim(),

        complication_present:
          complicationPresent,

        complication_notes:
          complicationNotes,

        referral_required:
          referralRequired,

        referral_notes:
          referralNotes,

        clinical_notes:
          notes.trim() || null,

        status:
          referralRequired
            ? "referred"
            : "completed",

        completed_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", followup.id);

    if (error) {
      console.error(error);

      window.alert(
        error.message ||
          "Follow-up could not be saved."
      );

      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
  }

  const completed =
    followup.status ===
      "completed" ||
    followup.status ===
      "referred";

  return (
    <div className="rounded-2xl border border-[#dfe9e5] bg-[#fbfdfc] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-[#10233c]">
              {followupLabel()}
            </p>

            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              followup.status ===
              "completed"
                ? "bg-[#e7f6f1] text-[#087f6b]"
                : followup.status ===
                  "referred"
                ? "bg-[#fff7df] text-[#946900]"
                : "bg-[#eef2f8] text-[#40546d]"
            }`}>
              {followup.status}
            </span>
          </div>

          <p className="mt-1 text-xs text-[#65756f]">
            Due{" "}
            {followup.scheduled_date ||
              "—"}
          </p>

          {completed &&
            followup.visual_acuity && (
              <p className="mt-2 text-sm text-[#52635d]">
                Visual acuity:{" "}
                <strong className="text-[#10233c]">
                  {
                    followup.visual_acuity
                  }
                </strong>
              </p>
            )}

          {followup.complication_present && (
            <p className="mt-1 text-sm text-red-700">
              Complication:{" "}
              {followup.complication_notes ||
                "Recorded"}
            </p>
          )}

          {followup.referral_required && (
            <p className="mt-1 text-sm text-[#946900]">
              Referral required
              {followup.referral_notes
                ? ` — ${followup.referral_notes}`
                : ""}
            </p>
          )}
        </div>

        {!completed && (
          <button
            type="button"
            disabled={
              disabled || saving
            }
            onClick={
              recordFollowup
            }
            className="rounded-xl bg-[#087f6b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#056554] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Record Follow-Up"}
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#dfe9e5] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8984]">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-[#10233c]">
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: string;
}) {
  return (
    <span className="rounded-full bg-[#eef2f8] px-3 py-1 text-xs font-bold text-[#40546d]">
      {status}
    </span>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        primary
          ? "bg-[#087f6b] text-white hover:bg-[#056554]"
          : "border border-[#dfe9e5] bg-white text-[#52635d] hover:bg-[#f6faf8]"
      }`}
    >
      {children}
    </button>
  );
}
