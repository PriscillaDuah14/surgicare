"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type ClusterStatus =
  | "proposed"
  | "approved"
  | "hold"
  | "held"
  | "rejected"
  | "split_requested"
  | "deployed";

type Cluster = {
  id: string;

  cluster_name: string;

  region: string | null;
  district: string | null;

  status: ClusterStatus;

  facility_count: number;
  patient_count: number;
  ready_patient_count: number;

  cataract_count: number;
  pterygium_count: number;

  readiness_percentage:
    | number
    | string;

  priority_score:
    | number
    | string;

  recommendation_reason:
    | string
    | null;

  driving_distance_km:
    | number
    | string
    | null;

  remoteness_score:
    | number
    | string
    | null;

  estimated_cost:
    | number
    | string
    | null;

  expected_nhis_reimbursement:
    | number
    | string
    | null;

  nearest_ngo_mission:
    | string
    | null;

  recommended_action:
    | string
    | null;

  coordinator_decision:
    | string
    | null;

  override_reason:
    | string
    | null;

  decision_at:
    | string
    | null;

  deployed_mission_id:
    | string
    | null;
};

type ClusterFacility = {
  facility_id: string;

  facility_name: string;

  facility_type: string | null;

  district: string | null;

  region: string | null;

  gps_address: string | null;

  verification_status: string;

  patient_count:
    | number
    | string;

  ready_patient_count:
    | number
    | string;
};

type Profile = {
  full_name: string | null;
  role: string;
};

export default function RecommendationsPage() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [clusters, setClusters] =
    useState<Cluster[]>([]);

  const [
    selectedCluster,
    setSelectedCluster,
  ] = useState<Cluster | null>(
    null
  );

  const [
    clusterFacilities,
    setClusterFacilities,
  ] = useState<
    ClusterFacility[]
  >([]);

  const [
    loadingFacilities,
    setLoadingFacilities,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [
    generating,
    setGenerating,
  ] = useState(false);

  const [
    updatingId,
    setUpdatingId,
  ] = useState<string | null>(
    null
  );

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    deployedMissionId,
    setDeployedMissionId,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    function handlePopState() {
      if (selectedCluster) {
        setSelectedCluster(
          null
        );

        setClusterFacilities(
          []
        );
      }
    }

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, [selectedCluster]);

  async function initialize() {
    setError("");

    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session) {
      window.location.href =
        "/login";

      return;
    }

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "full_name, role"
      )
      .eq(
        "id",
        session.user.id
      )
      .single();

    if (
      profileError ||
      !profileData
    ) {
      console.error(
        profileError
      );

      setError(
        "Unable to load your SurgiCare profile."
      );

      setLoading(false);

      return;
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

    await loadClusters();

    setLoading(false);
  }

  async function loadClusters() {
    const {
      data,
      error,
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
        driving_distance_km,
        remoteness_score,
        estimated_cost,
        expected_nhis_reimbursement,
        nearest_ngo_mission,
        recommended_action,
        coordinator_decision,
        override_reason,
        decision_at,
        deployed_mission_id
        `
      )
      .order(
        "priority_score",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(error);

      setError(
        "Unable to load cluster recommendations."
      );

      return;
    }

    setClusters(
      data || []
    );
  }

  async function generateRecommendations() {
    setGenerating(true);

    setError("");
    setMessage("");
    setDeployedMissionId(
      null
    );

    const {
      data,
      error,
    } = await supabase.rpc(
      "generate_cluster_recommendations"
    );

    if (error) {
      console.error(error);

      setError(
        error.message
      );

      setGenerating(false);

      return;
    }

    setMessage(
      `${data ?? 0} recommendation${
        Number(data) === 1
          ? ""
          : "s"
      } generated.`
    );

    await loadClusters();

    setGenerating(false);
  }

  async function openCluster(
    cluster: Cluster
  ) {
    setSelectedCluster(
      cluster
    );

    setClusterFacilities(
      []
    );

    setError("");

    window.history.pushState(
      {
        cluster:
          cluster.id,
      },
      "",
      window.location.href
    );

    setLoadingFacilities(
      true
    );

    const {
      data,
      error,
    } = await supabase.rpc(
      "get_cluster_facility_details",
      {
        p_cluster_id:
          cluster.id,
      }
    );

    if (error) {
      console.error(error);

      setError(
        error.message
      );

      setLoadingFacilities(
        false
      );

      return;
    }

    setClusterFacilities(
      data || []
    );

    setLoadingFacilities(
      false
    );
  }

  function closeCluster() {
    setSelectedCluster(
      null
    );

    setClusterFacilities(
      []
    );

    if (
      window.history.state
        ?.cluster
    ) {
      window.history.back();
    }
  }

  async function reviewCluster(
    cluster: Cluster,
    decision:
      | "hold"
      | "reject"
      | "split"
  ) {
    let promptText =
      "";

    if (
      decision === "hold"
    ) {
      promptText =
        "Why should this cluster be placed on hold?";
    }

    if (
      decision === "reject"
    ) {
      promptText =
        "Why are you rejecting this cluster?";
    }

    if (
      decision === "split"
    ) {
      promptText =
        "Why should this cluster be split?";
    }

    const reason =
      window.prompt(
        promptText
      );

    if (
      reason === null
    ) {
      return;
    }

    if (
      !reason.trim()
    ) {
      setError(
        "Please provide an override reason."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Confirm ${
          decision === "hold"
            ? "Hold"
            : decision ===
              "reject"
            ? "Reject"
            : "Split Request"
        } for ${cluster.cluster_name}?`
      );

    if (!confirmed) {
      return;
    }

    setUpdatingId(
      cluster.id
    );

    setError("");
    setMessage("");
    setDeployedMissionId(
      null
    );

    const {
      error,
    } = await supabase.rpc(
      "review_cluster",
      {
        p_cluster_id:
          cluster.id,

        p_decision:
          decision,

        p_override_reason:
          reason.trim(),
      }
    );

    if (error) {
      console.error(error);

      setError(
        error.message
      );

      setUpdatingId(
        null
      );

      return;
    }

    setMessage(
      decision === "split"
        ? `${cluster.cluster_name} has been flagged for splitting.`
        : `${cluster.cluster_name} has been ${
            decision ===
            "hold"
              ? "placed on hold"
              : "rejected"
          }.`
    );

    await loadClusters();

    setSelectedCluster(
      null
    );

    setUpdatingId(
      null
    );
  }

  function buildMission(
    cluster: Cluster
  ) {
    window.location.href =
      `/coordinator/missions/new?cluster=${encodeURIComponent(
        cluster.id
      )}`;
  }

  const totals = useMemo(
    () => {
      return {
        total:
          clusters.length,

        proposed:
          clusters.filter(
            (item) =>
              item.status ===
              "proposed"
          ).length,

        deployed:
          clusters.filter(
            (item) =>
              item.status ===
              "deployed"
          ).length,

        held:
          clusters.filter(
            (item) =>
              item.status ===
                "held" ||
              item.status ===
                "hold"
          ).length,

        ready:
          clusters.reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item.ready_patient_count ||
                  0
              ),
            0
          ),
      };
    },
    [clusters]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm text-[#65756f]">
            Loading recommendation engine...
          </p>
        </div>
      </main>
    );
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
                Recommendation Engine
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
                  "/coordinator";
              }}
              className="rounded-xl border border-[#dfe9e5] bg-white px-4 py-2 text-sm font-semibold text-[#52635d]"
            >
              Control Tower
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
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                Human-guided intelligence
              </span>

              <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                Outreach Cluster Engine
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
                Analyze patient backlog, surgical readiness,
                facility capacity and outreach priority before
                deploying a mission.
              </p>

              <button
                type="button"
                onClick={
                  generateRecommendations
                }
                disabled={
                  generating
                }
                className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-[#087f6b] disabled:opacity-60"
              >
                {generating
                  ? "Generating..."
                  : "Generate recommendations"}
              </button>
            </div>
          </div>
        </section>

        {/* FEEDBACK */}

        {message && (
          <div className="mt-6 rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-4 text-sm font-medium text-[#08705f]">
            {message}

            {deployedMissionId && (
              <p className="mt-2 text-xs">
                Mission ID:{" "}
                <strong>
                  {deployedMissionId}
                </strong>
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            label="Clusters"
            value={
              totals.total
            }
          />

          <Metric
            label="Proposed"
            value={
              totals.proposed
            }
          />

          <Metric
            label="Deployed"
            value={
              totals.deployed
            }
            green
          />

          <Metric
            label="On hold"
            value={
              totals.held
            }
          />

          <Metric
            label="Ready patients"
            value={
              totals.ready
            }
            green
          />
        </section>

        {/* SCORING */}

        <section className="mt-8 rounded-3xl border border-[#dfe9e5] bg-white p-6 md:p-8">
          <p className="text-sm font-semibold text-[#087f6b]">
            Transparent MVP scoring
          </p>

          <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
            How recommendations are ranked
          </h3>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ScoreCard
              value="40"
              title="Patient volume"
              text="Higher surgical backlog increases outreach priority."
            />

            <ScoreCard
              value="40"
              title="Ready patients"
              text="Patients ready for surgery increase deployability."
            />

            <ScoreCard
              value="20"
              title="Readiness percentage"
              text="Facility and patient readiness complete the priority score."
            />
          </div>
        </section>

        {/* RESULTS */}

        <section className="mt-8">
          <p className="text-sm font-semibold text-[#087f6b]">
            Proposed outreach
          </p>

          <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
            Cluster recommendations
          </h3>

          {clusters.length ===
          0 ? (
            <div className="mt-6 rounded-3xl border border-[#dfe9e5] bg-white p-10 text-center">
              <h4 className="text-xl font-bold text-[#10233c]">
                No recommendations yet
              </h4>

              <p className="mt-2 text-sm text-[#65756f]">
                Generate recommendations to create the first
                proposed outreach clusters.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {clusters.map(
                (
                  cluster,
                  index
                ) => (
                  <ClusterCard
                    key={
                      cluster.id
                    }
                    cluster={
                      cluster
                    }
                    rank={
                      index + 1
                    }
                    updating={
                      updatingId ===
                      cluster.id
                    }
                    onView={() =>
                      openCluster(
                        cluster
                      )
                    }
                    onApprove={() =>
                      buildMission(
                        cluster
                      )
                    }
                    onHold={() =>
                      reviewCluster(
                        cluster,
                        "hold"
                      )
                    }
                    onReject={() =>
                      reviewCluster(
                        cluster,
                        "reject"
                      )
                    }
                    onSplit={() =>
                      reviewCluster(
                        cluster,
                        "split"
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>

      {/* CLUSTER DETAIL MODAL */}

      {selectedCluster && (
        <ClusterModal
          cluster={
            selectedCluster
          }
          facilities={
            clusterFacilities
          }
          loadingFacilities={
            loadingFacilities
          }
          updating={
            updatingId ===
            selectedCluster.id
          }
          onClose={
            closeCluster
          }
          onApprove={() =>
            buildMission(
              selectedCluster
            )
          }
          onHold={() =>
            reviewCluster(
              selectedCluster,
              "hold"
            )
          }
          onReject={() =>
            reviewCluster(
              selectedCluster,
              "reject"
            )
          }
          onSplit={() =>
            reviewCluster(
              selectedCluster,
              "split"
            )
          }
        />
      )}
    </main>
  );
}

function ClusterModal({
  cluster,
  facilities,
  loadingFacilities,
  updating,
  onClose,
  onApprove,
  onHold,
  onReject,
  onSplit,
}: {
  cluster: Cluster;

  facilities: ClusterFacility[];

  loadingFacilities: boolean;

  updating: boolean;

  onClose: () => void;

  onApprove: () => void;

  onHold: () => void;

  onReject: () => void;

  onSplit: () => void;
}) {
  const score =
    Number(
      cluster.priority_score ||
        0
    );

  const readiness =
    Number(
      cluster.readiness_percentage ||
        0
    );

  const distance =
    cluster.driving_distance_km !==
      null &&
    cluster.driving_distance_km !==
      undefined
      ? `${Number(
          cluster.driving_distance_km
        ).toFixed(1)} km`
      : "Not calculated";

  const remoteness =
    cluster.remoteness_score !==
      null &&
    cluster.remoteness_score !==
      undefined
      ? `${Number(
          cluster.remoteness_score
        ).toFixed(1)}/100`
      : "Not calculated";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#10233c]/55 p-4 backdrop-blur-sm">
      <div className="mx-auto my-6 max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* HEADER */}

        <div className="bg-[#087f6b] p-6 text-white md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                Cluster Intelligence
              </span>

              <h2 className="mt-4 text-3xl font-bold">
                {cluster.cluster_name}
              </h2>

              <p className="mt-2 text-sm text-emerald-50">
                {[
                  cluster.district,
                  cluster.region,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* CORE INTELLIGENCE */}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailMetric
              label="Priority"
              value={`${score.toFixed(
                1
              )}/100`}
            />

            <DetailMetric
              label="Facilities"
              value={String(
                cluster.facility_count
              )}
            />

            <DetailMetric
              label="Patient backlog"
              value={String(
                cluster.patient_count
              )}
            />

            <DetailMetric
              label="Ready patients"
              value={String(
                cluster.ready_patient_count
              )}
              green
            />

            <DetailMetric
              label="Cataract"
              value={String(
                cluster.cataract_count
              )}
            />

            <DetailMetric
              label="Pterygium"
              value={String(
                cluster.pterygium_count
              )}
            />

            <DetailMetric
              label="Driving distance"
              value={
                distance
              }
            />

            <DetailMetric
              label="Remoteness"
              value={
                remoteness
              }
            />
          </div>

          {/* FINANCE */}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <MoneyCard
              label="Estimated mission cost"
              value={
                cluster.estimated_cost
              }
            />

            <MoneyCard
              label="Expected NHIS reimbursement"
              value={
                cluster.expected_nhis_reimbursement
              }
            />
          </div>

          {/* READINESS */}

          <div className="mt-6 rounded-2xl bg-[#f8fbfa] p-5">
            <div className="flex justify-between">
              <p className="font-semibold text-[#10233c]">
                Readiness
              </p>

              <p className="font-bold text-[#087f6b]">
                {readiness.toFixed(
                  1
                )}
                %
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfe9e5]">
              <div
                className="h-full rounded-full bg-[#087f6b]"
                style={{
                  width: `${Math.min(
                    readiness,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* RECOMMENDATION */}

          <div className="mt-6 rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
              AI recommended action
            </p>

            <p className="mt-2 text-lg font-bold text-[#10233c]">
              {cluster.recommended_action ||
                "Review cluster for outreach deployment"}
            </p>

            {cluster.recommendation_reason && (
              <p className="mt-3 text-sm leading-6 text-[#52635d]">
                {
                  cluster.recommendation_reason
                }
              </p>
            )}

            {cluster.nearest_ngo_mission && (
              <p className="mt-3 text-xs text-[#65756f]">
                Nearest NGO mission:{" "}
                <strong>
                  {
                    cluster.nearest_ngo_mission
                  }
                </strong>
              </p>
            )}
          </div>

          {/* FACILITIES */}

          <section className="mt-8">
            <p className="text-sm font-semibold text-[#087f6b]">
              Cluster facilities
            </p>

            <h3 className="mt-1 text-xl font-bold text-[#10233c]">
              Facilities included
            </h3>

            {loadingFacilities ? (
              <p className="mt-4 text-sm text-[#65756f]">
                Loading facilities...
              </p>
            ) : facilities.length ===
              0 ? (
              <div className="mt-4 rounded-2xl border border-[#dfe9e5] p-5 text-sm text-[#65756f]">
                No facilities are currently linked to this cluster.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {facilities.map(
                  (
                    facility
                  ) => (
                    <div
                      key={
                        facility.facility_id
                      }
                      className="rounded-2xl border border-[#dfe9e5] p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                              .filter(
                                Boolean
                              )
                              .join(
                                ", "
                              )}
                          </p>

                          {facility.gps_address && (
                            <p className="mt-1 text-xs text-[#7a8984]">
                              GPS:{" "}
                              {
                                facility.gps_address
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <MiniMetric
                            label="Patients"
                            value={Number(
                              facility.patient_count ||
                                0
                            )}
                          />

                          <MiniMetric
                            label="Ready"
                            value={Number(
                              facility.ready_patient_count ||
                                0
                            )}
                            green
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* CURRENT DECISION */}

          {cluster.coordinator_decision && (
            <div className="mt-6 rounded-2xl border border-[#dfe9e5] bg-[#f8fbfa] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#65756f]">
                Coordinator decision
              </p>

              <p className="mt-2 font-bold capitalize text-[#10233c]">
                {
                  cluster.coordinator_decision
                }
              </p>

              {cluster.override_reason && (
                <p className="mt-2 text-sm text-[#65756f]">
                  {
                    cluster.override_reason
                  }
                </p>
              )}
            </div>
          )}

          {/* ACTIONS */}

          <div className="mt-8 border-t border-[#e5eeea] pt-6">
            {cluster.status ===
            "deployed" ? (
              <div className="rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-5">
                <p className="font-bold text-[#087f6b]">
                  ✓ Mission deployed
                </p>

                <p className="mt-2 text-sm text-[#52635d]">
                  This cluster has already been converted into a SurgiCare mission.
                </p>

                {cluster.deployed_mission_id && (
                  <p className="mt-2 text-xs text-[#65756f]">
                    Mission ID:{" "}
                    {
                      cluster.deployed_mission_id
                    }
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-[#10233c]">
                  Human review
                </p>

                <p className="mt-1 text-sm text-[#65756f]">
                  Recommendations do not deploy automatically. A coordinator must make the final decision.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <button
                    type="button"
                    disabled={
                      updating
                    }
                    onClick={
                      onApprove
                    }
                    className="rounded-xl bg-[#087f6b] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {updating
                      ? "Working..."
                      : "Build Mission →"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      updating
                    }
                    onClick={
                      onHold
                    }
                    className="rounded-xl border border-[#e9d99e] bg-[#fff9e8] px-5 py-3.5 text-sm font-semibold text-[#886600] disabled:opacity-50"
                  >
                    Hold
                  </button>

                  <button
                    type="button"
                    disabled={
                      updating
                    }
                    onClick={
                      onSplit
                    }
                    className="rounded-xl border border-[#b9cedd] bg-[#f4f8fb] px-5 py-3.5 text-sm font-semibold text-[#42667f] disabled:opacity-50"
                  >
                    Split
                  </button>

                  <button
                    type="button"
                    disabled={
                      updating
                    }
                    onClick={
                      onReject
                    }
                    className="rounded-xl border border-red-200 bg-white px-5 py-3.5 text-sm font-semibold text-red-600 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClusterCard({
  cluster,
  rank,
  updating,
  onView,
  onApprove,
  onHold,
  onReject,
  onSplit,
}: {
  cluster: Cluster;

  rank: number;

  updating: boolean;

  onView: () => void;

  onApprove: () => void;

  onHold: () => void;

  onReject: () => void;

  onSplit: () => void;
}) {
  const score =
    Number(
      cluster.priority_score ||
        0
    );

  const readiness =
    Number(
      cluster.readiness_percentage ||
        0
    );

  const priority =
    score >= 70
      ? "High"
      : score >= 40
      ? "Medium"
      : "Low";

  return (
    <article className="rounded-3xl border border-[#dfe9e5] bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10233c] text-sm font-bold text-white">
              {rank}
            </span>

            <h3 className="text-xl font-bold text-[#10233c]">
              {
                cluster.cluster_name
              }
            </h3>

            <span className="rounded-full bg-[#e7f6f1] px-3 py-1 text-xs font-semibold text-[#087f6b]">
              {priority} priority
            </span>

            <span className="rounded-full bg-[#f0f4f2] px-3 py-1 text-xs font-semibold capitalize text-[#52635d]">
              {formatStatus(
                cluster.status
              )}
            </span>
          </div>

          <p className="mt-2 text-sm text-[#65756f]">
            {[
              cluster.district,
              cluster.region,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <ClusterStat
              label="Score"
              value={`${score.toFixed(
                1
              )}/100`}
            />

            <ClusterStat
              label="Facilities"
              value={String(
                cluster.facility_count
              )}
            />

            <ClusterStat
              label="Patients"
              value={String(
                cluster.patient_count
              )}
            />

            <ClusterStat
              label="Ready"
              value={String(
                cluster.ready_patient_count
              )}
            />

            <ClusterStat
              label="Cataract"
              value={String(
                cluster.cataract_count
              )}
            />

            <ClusterStat
              label="Pterygium"
              value={String(
                cluster.pterygium_count
              )}
            />
          </div>

          <div className="mt-6 rounded-2xl bg-[#f8fbfa] p-5">
            <div className="flex justify-between gap-4">
              <p className="text-sm font-semibold text-[#10233c]">
                Readiness
              </p>

              <p className="text-sm font-bold text-[#087f6b]">
                {readiness.toFixed(
                  1
                )}
                %
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfe9e5]">
              <div
                className="h-full rounded-full bg-[#087f6b]"
                style={{
                  width: `${Math.min(
                    readiness,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {cluster.recommendation_reason && (
            <div className="mt-6 rounded-2xl border border-[#dfe9e5] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
                Why this was recommended
              </p>

              <p className="mt-2 text-sm leading-6 text-[#65756f]">
                {
                  cluster.recommendation_reason
                }
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 xl:w-48 xl:flex-col">
          <button
            type="button"
            onClick={
              onView
            }
            className="flex-1 rounded-xl border border-[#087f6b] bg-white px-4 py-3 text-sm font-semibold text-[#087f6b]"
          >
            View Details
          </button>

          {cluster.status !==
            "deployed" && (
            <>
              <button
                type="button"
                disabled={
                  updating
                }
                onClick={
                  onApprove
                }
                className="flex-1 rounded-xl bg-[#087f6b] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Build Mission →
              </button>

              <button
                type="button"
                disabled={
                  updating
                }
                onClick={
                  onHold
                }
                className="flex-1 rounded-xl border border-[#e9d99e] bg-[#fff9e8] px-4 py-3 text-sm font-semibold text-[#886600] disabled:opacity-50"
              >
                Hold
              </button>

              <button
                type="button"
                disabled={
                  updating
                }
                onClick={
                  onSplit
                }
                className="flex-1 rounded-xl border border-[#b9cedd] bg-[#f4f8fb] px-4 py-3 text-sm font-semibold text-[#42667f] disabled:opacity-50"
              >
                Split
              </button>

              <button
                type="button"
                disabled={
                  updating
                }
                onClick={
                  onReject
                }
                className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function Metric({
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

function ScoreCard({
  value,
  title,
  text,
}: {
  value: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f8fbfa] p-5">
      <p className="text-3xl font-bold text-[#087f6b]">
        {value}
      </p>

      <p className="mt-2 font-bold text-[#10233c]">
        {title}
      </p>

      <p className="mt-1 text-sm text-[#65756f]">
        {text}
      </p>
    </div>
  );
}

function ClusterStat({
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

      <p className="mt-1 text-lg font-bold text-[#10233c]">
        {value}
      </p>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
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
        className={`mt-2 text-xl font-bold ${
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
          : "bg-[#f3f6f5]"
      }`}
    >
      <p className="text-xs text-[#65756f]">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${
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

function MoneyCard({
  label,
  value,
}: {
  label: string;

  value:
    | number
    | string
    | null;
}) {
  const numeric =
    value === null ||
    value === undefined
      ? null
      : Number(value);

  return (
    <div className="rounded-2xl border border-[#dfe9e5] bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#65756f]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-[#10233c]">
        {numeric === null ||
        Number.isNaN(numeric)
          ? "Not calculated"
          : `GHS ${numeric.toLocaleString()}`}
      </p>
    </div>
  );
}

function formatStatus(
  status: ClusterStatus
) {
  if (
    status ===
    "split_requested"
  ) {
    return "Split requested";
  }

  if (
    status === "held" ||
    status === "hold"
  ) {
    return "On hold";
  }

  return status;
}