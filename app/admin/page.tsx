"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type AdminProfile = {
  id: string;
  full_name: string | null;
  role: string;
};

type UserRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  facility_name: string | null;

  request_id: string | null;
  request_status: string | null;
  request_reason: string | null;
  request_created_at: string | null;
};

export default function AdminPage() {
  const [admin, setAdmin] =
    useState<AdminProfile | null>(null);

  const [users, setUsers] =
    useState<UserRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [reviewingId, setReviewingId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", session.user.id)
        .single();

    if (profileError || !profile) {
      console.error(profileError);

      setError(
        "SurgiCare could not load your administrator profile."
      );

      setLoading(false);
      return;
    }

    if (profile.role !== "admin") {
      if (profile.role === "coordinator") {
        window.location.href = "/coordinator";
      } else {
        window.location.href = "/dashboard";
      }

      return;
    }

    setAdmin(profile);

    await loadUsers();

    setLoading(false);
  }

  async function loadUsers() {
    const { data, error } = await supabase.rpc(
      "admin_list_users"
    );

    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }

    setUsers(data || []);
  }

  async function reviewRequest(
    user: UserRow,
    decision: "approved" | "rejected"
  ) {
    if (!user.request_id) {
      return;
    }

    let note = "";

    if (decision === "rejected") {
      note =
        window.prompt(
          "Optional reason for rejecting this request:"
        ) || "";
    }

    const confirmed = window.confirm(
      decision === "approved"
        ? `Approve coordinator access for ${
            user.full_name || user.email
          }?`
        : `Reject coordinator access for ${
            user.full_name || user.email
          }?`
    );

    if (!confirmed) {
      return;
    }

    setReviewingId(user.request_id);
    setError("");
    setMessage("");

    const { error } = await supabase.rpc(
      "admin_review_coordinator_request",
      {
        p_request_id: user.request_id,
        p_decision: decision,
        p_admin_note: note || null,
      }
    );

    if (error) {
      console.error(error);
      setError(error.message);
      setReviewingId(null);
      return;
    }

    setMessage(
      decision === "approved"
        ? `${user.full_name || user.email} is now a coordinator.`
        : `Coordinator request rejected.`
    );

    await loadUsers();

    setReviewingId(null);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const summary = useMemo(() => {
    return {
      total: users.length,

      clinicians: users.filter(
        (user) => user.role === "clinician"
      ).length,

      coordinators: users.filter(
        (user) => user.role === "coordinator"
      ).length,

      admins: users.filter(
        (user) => user.role === "admin"
      ).length,

      pending: users.filter(
        (user) =>
          user.request_status === "pending"
      ).length,
    };
  }, [users]);

  const pendingRequests = users.filter(
    (user) =>
      user.request_status === "pending"
  );

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      user.full_name || "",
      user.email || "",
      user.role,
      user.facility_name || "",
    ].some((item) =>
      item.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm text-[#65756f]">
            Loading SurgiCare Administration...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      <header className="border-b border-[#dfe9e5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold text-[#10233c]">
              SurgiCare
            </h1>

            <p className="text-xs font-semibold text-[#087f6b]">
              Administration
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[#10233c]">
                {admin?.full_name || "Administrator"}
              </p>

              <p className="text-xs text-[#65756f]">
                System Admin
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-xl border border-[#dfe9e5] px-4 py-2 text-sm font-semibold text-[#52635d]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <section className="rounded-3xl bg-[#087f6b] p-8 text-white md:p-10">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            Administrator Workspace
          </span>

          <h2 className="mt-4 text-3xl font-bold md:text-4xl">
            Access Management
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
            Review SurgiCare users and decide who receives
            coordinator access to the Control Tower.
          </p>
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-4 text-sm text-[#08705f]">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            label="Registered Users"
            value={summary.total}
          />

          <Metric
            label="Clinicians"
            value={summary.clinicians}
          />

          <Metric
            label="Coordinators"
            value={summary.coordinators}
          />

          <Metric
            label="Admins"
            value={summary.admins}
          />

          <Metric
            label="Pending Requests"
            value={summary.pending}
            green
          />
        </section>

        {/* OPERATIONS ACCESS */}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/coordinator";
            }}
            className="group rounded-3xl border border-[#dfe9e5] bg-white p-6 text-left transition hover:border-[#87c9b7] hover:shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
              Network operations
            </p>

            <div className="mt-2 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#10233c]">
                  Control Tower
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#65756f]">
                  Review facilities, patient volumes,
                  readiness and outreach recommendations.
                </p>
              </div>

              <span className="text-2xl text-[#087f6b] transition group-hover:translate-x-1">
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
            className="group rounded-3xl bg-[#10233c] p-6 text-left transition hover:bg-[#1b3655]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8c8c0]">
              Surgical operations
            </p>

            <div className="mt-2 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Mission Control
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Open missions, deployments, surgical
                  operations and post-op workflows.
                </p>
              </div>

              <span className="text-2xl text-white transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </button>
        </section>

        {/* OPERATIONS ACCESS */}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/coordinator";
            }}
            className="group rounded-3xl border border-[#dfe9e5] bg-white p-6 text-left transition hover:border-[#87c9b7] hover:shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
              Network operations
            </p>

            <div className="mt-2 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#10233c]">
                  Control Tower
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#65756f]">
                  Review facilities, patient volumes,
                  readiness and outreach recommendations.
                </p>
              </div>

              <span className="text-2xl text-[#087f6b] transition group-hover:translate-x-1">
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
            className="group rounded-3xl bg-[#10233c] p-6 text-left transition hover:bg-[#1b3655]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8c8c0]">
              Surgical operations
            </p>

            <div className="mt-2 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Mission Control
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Open missions, deployments, surgical
                  operations and post-op workflows.
                </p>
              </div>

              <span className="text-2xl text-white transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </button>
        </section>

        {/* REQUESTS */}

        <section className="mt-8">
          <p className="text-sm font-semibold text-[#087f6b]">
            Approval queue
          </p>

          <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
            Coordinator Requests
          </h3>

          {pendingRequests.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-[#dfe9e5] bg-white p-8 text-center">
              <p className="font-semibold text-[#10233c]">
                No pending coordinator requests
              </p>

              <p className="mt-2 text-sm text-[#65756f]">
                New clinician requests will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5">
              {pendingRequests.map((user) => (
                <article
                  key={user.request_id}
                  className="rounded-3xl border border-[#dfe9e5] bg-white p-6"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-xl font-bold text-[#10233c]">
                          {user.full_name || "Unnamed user"}
                        </h4>

                        <span className="rounded-full bg-[#fff7df] px-3 py-1 text-xs font-semibold text-[#946900]">
                          Pending
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-[#65756f]">
                        {user.email || "Email unavailable"}
                      </p>

                      <p className="mt-1 text-sm text-[#65756f]">
                        Facility:{" "}
                        {user.facility_name || "Not linked"}
                      </p>

                      <div className="mt-5 rounded-2xl bg-[#f8fbfa] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
                          Request reason
                        </p>

                        <p className="mt-2 text-sm leading-6 text-[#52635d]">
                          {user.request_reason}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3 lg:w-48 lg:flex-col">
                      <button
                        disabled={
                          reviewingId === user.request_id
                        }
                        onClick={() =>
                          reviewRequest(
                            user,
                            "approved"
                          )
                        }
                        className="rounded-xl bg-[#087f6b] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Approve Coordinator
                      </button>

                      <button
                        disabled={
                          reviewingId === user.request_id
                        }
                        onClick={() =>
                          reviewRequest(
                            user,
                            "rejected"
                          )
                        }
                        className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* USERS */}

        <section className="mt-10 overflow-hidden rounded-3xl border border-[#dfe9e5] bg-white">
          <div className="border-b border-[#e5eeea] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#087f6b]">
                  User directory
                </p>

                <h3 className="mt-1 text-2xl font-bold text-[#10233c]">
                  All SurgiCare Users
                </h3>
              </div>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search name, email, role or facility..."
                className="w-full rounded-xl border border-[#dfe9e5] px-4 py-3 text-sm outline-none focus:border-[#087f6b] md:max-w-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 p-6">
            {filteredUsers.map((user) => (
              <div
                key={user.user_id}
                className="rounded-2xl border border-[#dfe9e5] bg-[#fbfdfc] p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-[#10233c]">
                      {user.full_name || "Unnamed user"}
                    </p>

                    <p className="mt-1 text-sm text-[#65756f]">
                      {user.email || "Email unavailable"}
                    </p>

                    {user.facility_name && (
                      <p className="mt-1 text-xs text-[#7a8984]">
                        {user.facility_name}
                      </p>
                    )}
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      user.role === "admin"
                        ? "bg-[#10233c] text-white"
                        : user.role === "coordinator"
                        ? "bg-[#e7f6f1] text-[#087f6b]"
                        : "bg-[#edf1ef] text-[#52635d]"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <button
            onClick={() => {
              window.location.href =
                "/coordinator";
            }}
            className="rounded-xl border border-[#dfe9e5] bg-white px-5 py-3 font-semibold text-[#087f6b]"
          >
            Open Control Tower →
          </button>
        </section>
      </div>
    </main>
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