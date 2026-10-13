"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type FacilityForm = {
  name: string;
  facility_type: string;

  gps_address: string;
  district: string;
  region: string;

  surgical_status: string;

  hefra_license_no: string;
  nhia_credential_no: string;

  payment_method: string;

  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;

  momo_network: string;
  momo_name: string;
  momo_number: string;

  lead_clinician_name: string;

  phone: string;
  whatsapp: string;

  referral_hospital: string;
};

const initialForm: FacilityForm = {
  name: "",
  facility_type: "",

  gps_address: "",
  district: "",
  region: "",

  surgical_status: "non_surgical",

  hefra_license_no: "",
  nhia_credential_no: "",

  payment_method: "",

  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",

  momo_network: "",
  momo_name: "",
  momo_number: "",

  lead_clinician_name: "",

  phone: "",
  whatsapp: "",

  referral_hospital: "",
};

const regions = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
];

export default function FacilityPage() {
  const [form, setForm] =
    useState<FacilityForm>(initialForm);

  const [facilityId, setFacilityId] =
    useState<string | null>(null);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [onboardingStep, setOnboardingStep] =
    useState(1);

  useEffect(() => {
    loadFacility();
  }, []);

  async function loadFacility() {
    setLoading(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    const currentUserId =
      session.user.id;

    setUserId(currentUserId);

    // ---------------------------------------
    // CHECK EXISTING FACILITY MEMBERSHIP
    // ---------------------------------------

    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from("facility_staff")
      .select("facility_id")
      .eq("user_id", currentUserId)
      .eq("is_active", true)
      .limit(1);

    if (membershipError) {
      console.error(
        membershipError
      );

      setError(
        "Unable to check your facility membership."
      );

      setLoading(false);
      return;
    }

    if (
      !memberships ||
      memberships.length === 0
    ) {
      setLoading(false);
      return;
    }

    const existingFacilityId =
      memberships[0].facility_id;

    setFacilityId(
      existingFacilityId
    );

    // ---------------------------------------
    // LOAD EXISTING FACILITY
    // ---------------------------------------

    const {
      data: facility,
      error: facilityError,
    } = await supabase
      .from("facilities")
      .select(
        `
        id,
        name,
        facility_type,
        gps_address,
        district,
        region,
        surgical_status,
        hefra_license_no,
        nhia_credential_no,
        payment_method,
        bank_name,
        bank_account_name,
        bank_account_number,
        momo_network,
        momo_name,
        momo_number,
        lead_clinician_name,
        phone,
        whatsapp,
        referral_hospital,
        onboarding_step
        `
      )
      .eq(
        "id",
        existingFacilityId
      )
      .single();

    if (facilityError) {
      console.error(
        facilityError
      );

      setError(
        "Unable to load your facility."
      );

      setLoading(false);
      return;
    }

    setForm({
      name:
        facility.name || "",

      facility_type:
        facility.facility_type ||
        "",

      gps_address:
        facility.gps_address ||
        "",

      district:
        facility.district || "",

      region:
        facility.region || "",

      surgical_status:
        facility.surgical_status ||
        "non_surgical",

      hefra_license_no:
        facility.hefra_license_no ||
        "",

      nhia_credential_no:
        facility.nhia_credential_no ||
        "",

      payment_method:
        facility.payment_method ||
        "",

      bank_name:
        facility.bank_name || "",

      bank_account_name:
        facility.bank_account_name ||
        "",

      bank_account_number:
        facility.bank_account_number ||
        "",

      momo_network:
        facility.momo_network ||
        "",

      momo_name:
        facility.momo_name || "",

      momo_number:
        facility.momo_number ||
        "",

      lead_clinician_name:
        facility.lead_clinician_name ||
        "",

      phone:
        facility.phone || "",

      whatsapp:
        facility.whatsapp || "",

      referral_hospital:
        facility.referral_hospital ||
        "",
    });

    setOnboardingStep(
      facility.onboarding_step || 1
    );

    setLoading(false);
  }

  function updateField(
    field: keyof FacilityForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validate() {
    setError("");

    if (!form.name.trim()) {
      setError(
        "Please enter the facility name."
      );
      return false;
    }

    if (!form.facility_type) {
      setError(
        "Please select the facility type."
      );
      return false;
    }

    if (
      !form.gps_address.trim()
    ) {
      setError(
        "Please enter the GPS address."
      );
      return false;
    }

    if (!form.district.trim()) {
      setError(
        "Please enter the district."
      );
      return false;
    }

    if (!form.region) {
      setError(
        "Please select the region."
      );
      return false;
    }

    if (
      !form.lead_clinician_name.trim()
    ) {
      setError(
        "Please enter the lead clinician."
      );
      return false;
    }

    if (!form.phone.trim()) {
      setError(
        "Please enter a facility phone number."
      );
      return false;
    }

    if (!form.payment_method) {
      setError(
        "Please choose a payment method."
      );
      return false;
    }

    if (
      form.payment_method ===
      "bank"
    ) {
      if (
        !form.bank_name.trim() ||
        !form.bank_account_name.trim() ||
        !form.bank_account_number.trim()
      ) {
        setError(
          "Please complete the bank details."
        );
        return false;
      }
    }

    if (
      form.payment_method ===
      "momo"
    ) {
      if (
        !form.momo_network ||
        !form.momo_name.trim() ||
        !form.momo_number.trim()
      ) {
        setError(
          "Please complete the Mobile Money details."
        );
        return false;
      }
    }

    return true;
  }

  async function saveStepOne(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (!userId) {
      setError(
        "Your session could not be verified."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);

    const payload = {
      name:
        form.name.trim(),

      facility_type:
        form.facility_type,

      gps_address:
        form.gps_address.trim(),

      district:
        form.district.trim(),

      region:
        form.region,

      surgical_status:
        form.surgical_status,

      hefra_license_no:
        form.hefra_license_no.trim() ||
        null,

      nhia_credential_no:
        form.nhia_credential_no.trim() ||
        null,

      payment_method:
        form.payment_method,

      bank_name:
        form.payment_method ===
        "bank"
          ? form.bank_name.trim()
          : null,

      bank_account_name:
        form.payment_method ===
        "bank"
          ? form.bank_account_name.trim()
          : null,

      bank_account_number:
        form.payment_method ===
        "bank"
          ? form.bank_account_number.trim()
          : null,

      momo_network:
        form.payment_method ===
        "momo"
          ? form.momo_network
          : null,

      momo_name:
        form.payment_method ===
        "momo"
          ? form.momo_name.trim()
          : null,

      momo_number:
        form.payment_method ===
        "momo"
          ? form.momo_number.trim()
          : null,

      lead_clinician_name:
        form.lead_clinician_name.trim(),

      phone:
        form.phone.trim(),

      whatsapp:
        form.whatsapp.trim() ||
        null,

      referral_hospital:
        form.referral_hospital.trim() ||
        null,

      updated_at:
        new Date().toISOString(),
    };

    // ---------------------------------------
    // UPDATE EXISTING FACILITY
    //
    // IMPORTANT:
    // We DO NOT reset onboarding_step here.
    // If this facility already completed Step 2
    // or Step 3, editing Step 1 will preserve
    // that progress.
    // ---------------------------------------

    if (facilityId) {
      const {
        error: updateError,
      } = await supabase
        .from("facilities")
        .update(payload)
        .eq("id", facilityId);

      if (updateError) {
        console.error(
          updateError
        );

        setError(
          updateError.message
        );

        setSaving(false);
        return;
      }

      setSuccess(true);
      setSaving(false);
      return;
    }

    // ---------------------------------------
    // CREATE NEW FACILITY
    // ---------------------------------------

    const {
      data: facility,
      error: insertError,
    } = await supabase
      .from("facilities")
      .insert({
        ...payload,

        onboarding_step: 1,

        verification_status:
          "pending",

        created_by:
          userId,
      })
      .select("id")
      .single();

    if (
      insertError ||
      !facility
    ) {
      console.error(
        insertError
      );

      setError(
        insertError?.message ||
          "Unable to create the facility."
      );

      setSaving(false);
      return;
    }

    // ---------------------------------------
    // LINK CLINICIAN TO FACILITY
    // ---------------------------------------

    const {
      error: linkError,
    } = await supabase
      .from("facility_staff")
      .insert({
        facility_id:
          facility.id,

        user_id:
          userId,

        is_active:
          true,
      });

    if (linkError) {
      console.error(
        linkError
      );

      await supabase
        .from("facilities")
        .delete()
        .eq(
          "id",
          facility.id
        );

      setError(
        "The facility was created, but SurgiCare could not link it to your account."
      );

      setSaving(false);
      return;
    }

    // ---------------------------------------
    // AUDIT
    // ---------------------------------------

    const {
      error: auditError,
    } = await supabase
      .from("audit_logs")
      .insert({
        user_id:
          userId,

        action:
          "facility_onboarding_step_1_completed",

        entity_type:
          "facility",

        entity_id:
          facility.id,

        details: {
          facility_name:
            form.name.trim(),

          district:
            form.district.trim(),

          region:
            form.region,
        },
      });

    if (auditError) {
      console.error(
        "Audit log error:",
        auditError
      );
    }

    setFacilityId(
      facility.id
    );

    setOnboardingStep(1);

    setSuccess(true);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Loading facility onboarding...
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
                Step 1 of 3
              </span>

              <h2 className="mt-4 text-3xl font-bold text-white">
                Facility Verification
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
                Provide the facility identification, regulatory,
                payment and referral information required for
                SurgiCare participation.
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
              active
            />

            <ProgressStep
              number="2"
              title="Readiness"
            />

            <ProgressStep
              number="3"
              title="Confirmation"
            />
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS + CONTINUE */}

        {success && (
          <div className="mt-6 rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-5">
            <p className="font-semibold text-[#08705f]">
              ✓ Verification details saved
            </p>

            <p className="mt-2 text-sm leading-6 text-[#52635d]">
              Step 1 is complete. Continue to Operational Readiness
              to add staffing, screening capacity and infrastructure details.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/facility/readiness";
              }}
              className="mt-4 rounded-xl bg-[#087f6b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#056554]"
            >
              Continue to Operational Readiness →
            </button>
          </div>
        )}

        <form
          onSubmit={saveStepOne}
          className="mt-6 overflow-hidden rounded-3xl border border-[#dfe9e5] bg-white"
        >
          {/* BASIC INFORMATION */}

          <FormSection
            title="Facility information"
            description="Basic identification and location details."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Facility name"
                required
              >
                <input
                  value={form.name}
                  onChange={(e) =>
                    updateField(
                      "name",
                      e.target.value
                    )
                  }
                  placeholder="Facility name"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Facility type"
                required
              >
                <select
                  value={
                    form.facility_type
                  }
                  onChange={(e) =>
                    updateField(
                      "facility_type",
                      e.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select type
                  </option>

                  <option value="Eye Center">
                    Eye Center
                  </option>

                  <option value="CHAG">
                    CHAG
                  </option>

                  <option value="Health Center">
                    Health Center
                  </option>

                  <option value="District Hospital">
                    District Hospital
                  </option>
                </select>
              </Field>

              <Field
                label="GPS address"
                required
              >
                <input
                  value={
                    form.gps_address
                  }
                  onChange={(e) =>
                    updateField(
                      "gps_address",
                      e.target.value
                    )
                  }
                  placeholder="e.g. GA-123-4567"
                  className={inputClass}
                />
              </Field>

              <Field
                label="District"
                required
              >
                <input
                  value={
                    form.district
                  }
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

              <Field
                label="Region"
                required
              >
                <select
                  value={form.region}
                  onChange={(e) =>
                    updateField(
                      "region",
                      e.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select region
                  </option>

                  {regions.map(
                    (region) => (
                      <option
                        key={region}
                        value={region}
                      >
                        {region}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Surgical status"
                required
              >
                <select
                  value={
                    form.surgical_status
                  }
                  onChange={(e) =>
                    updateField(
                      "surgical_status",
                      e.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="non_surgical">
                    Non-surgical
                  </option>

                  <option value="limited">
                    Limited surgical capacity
                  </option>

                  <option value="surgical">
                    Surgical facility
                  </option>
                </select>
              </Field>
            </div>
          </FormSection>

          <Divider />

          {/* REGULATORY */}

          <FormSection
            title="Regulatory verification"
            description="Record facility regulatory credentials."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="HeFRA licence number">
                <input
                  value={
                    form.hefra_license_no
                  }
                  onChange={(e) =>
                    updateField(
                      "hefra_license_no",
                      e.target.value
                    )
                  }
                  placeholder="HeFRA licence"
                  className={inputClass}
                />
              </Field>

              <Field label="NHIA credential number">
                <input
                  value={
                    form.nhia_credential_no
                  }
                  onChange={(e) =>
                    updateField(
                      "nhia_credential_no",
                      e.target.value
                    )
                  }
                  placeholder="NHIA credential"
                  className={inputClass}
                />
              </Field>
            </div>
          </FormSection>

          <Divider />

          {/* CLINICAL CONTACT */}

          <FormSection
            title="Clinical contact"
            description="Primary facility contact and referral information."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Lead clinician"
                required
              >
                <input
                  value={
                    form.lead_clinician_name
                  }
                  onChange={(e) =>
                    updateField(
                      "lead_clinician_name",
                      e.target.value
                    )
                  }
                  placeholder="Full name"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Facility phone"
                required
              >
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    updateField(
                      "phone",
                      e.target.value
                    )
                  }
                  placeholder="+233..."
                  className={inputClass}
                />
              </Field>

              <Field label="WhatsApp">
                <input
                  type="tel"
                  value={
                    form.whatsapp
                  }
                  onChange={(e) =>
                    updateField(
                      "whatsapp",
                      e.target.value
                    )
                  }
                  placeholder="+233..."
                  className={inputClass}
                />
              </Field>

              <Field label="Referral hospital">
                <input
                  value={
                    form.referral_hospital
                  }
                  onChange={(e) =>
                    updateField(
                      "referral_hospital",
                      e.target.value
                    )
                  }
                  placeholder="Referral facility"
                  className={inputClass}
                />
              </Field>
            </div>
          </FormSection>

          <Divider />

          {/* PAYMENT */}

          <FormSection
            title="Payment details"
            description="Select how facility payments or reimbursements should be routed."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceButton
                title="Bank account"
                selected={
                  form.payment_method ===
                  "bank"
                }
                onClick={() =>
                  updateField(
                    "payment_method",
                    "bank"
                  )
                }
              />

              <ChoiceButton
                title="Mobile Money"
                selected={
                  form.payment_method ===
                  "momo"
                }
                onClick={() =>
                  updateField(
                    "payment_method",
                    "momo"
                  )
                }
              />
            </div>

            {form.payment_method ===
              "bank" && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field
                  label="Bank name"
                  required
                >
                  <input
                    value={
                      form.bank_name
                    }
                    onChange={(e) =>
                      updateField(
                        "bank_name",
                        e.target.value
                      )
                    }
                    placeholder="Bank"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Account name"
                  required
                >
                  <input
                    value={
                      form.bank_account_name
                    }
                    onChange={(e) =>
                      updateField(
                        "bank_account_name",
                        e.target.value
                      )
                    }
                    placeholder="Account name"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Account number"
                  required
                >
                  <input
                    value={
                      form.bank_account_number
                    }
                    onChange={(e) =>
                      updateField(
                        "bank_account_number",
                        e.target.value
                      )
                    }
                    placeholder="Account number"
                    className={inputClass}
                  />
                </Field>
              </div>
            )}

            {form.payment_method ===
              "momo" && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field
                  label="MoMo network"
                  required
                >
                  <select
                    value={
                      form.momo_network
                    }
                    onChange={(e) =>
                      updateField(
                        "momo_network",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">
                      Select network
                    </option>

                    <option value="MTN">
                      MTN
                    </option>

                    <option value="Telecel">
                      Telecel
                    </option>

                    <option value="AT">
                      AT
                    </option>
                  </select>
                </Field>

                <Field
                  label="MoMo account name"
                  required
                >
                  <input
                    value={
                      form.momo_name
                    }
                    onChange={(e) =>
                      updateField(
                        "momo_name",
                        e.target.value
                      )
                    }
                    placeholder="Registered account name"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="MoMo number"
                  required
                >
                  <input
                    type="tel"
                    value={
                      form.momo_number
                    }
                    onChange={(e) =>
                      updateField(
                        "momo_number",
                        e.target.value
                      )
                    }
                    placeholder="+233..."
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
          </FormSection>

          {/* ACTION */}

          <div className="flex flex-col gap-3 border-t border-[#e5eeea] bg-[#fbfdfc] p-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <div>
              <p className="text-xs leading-5 text-[#65756f]">
                Step 2 captures operational readiness,
                staffing and infrastructure.
              </p>

              {facilityId &&
                onboardingStep >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href =
                        "/facility/readiness";
                    }}
                    className="mt-2 text-xs font-semibold text-[#087f6b] hover:underline"
                  >
                    Continue to Operational Readiness →
                  </button>
                )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#087f6b] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#056554] disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : facilityId
                ? "Save Verification Details"
                : "Complete Step 1"}
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
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#10233c]">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function ChoiceButton({
  title,
  selected,
  onClick,
}: {
  title: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left text-sm font-semibold transition ${
        selected
          ? "border-[#087f6b] bg-[#e7f6f1] text-[#087f6b]"
          : "border-[#dfe9e5] bg-white text-[#52635d]"
      }`}
    >
      {selected ? "✓ " : ""}
      {title}
    </button>
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
}: {
  number: string;
  title: string;
  active?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
          active
            ? "bg-[#087f6b] text-white"
            : "bg-[#edf1ef] text-[#7a8984]"
        }`}
      >
        {number}
      </div>

      <p
        className={`mt-2 text-xs font-semibold ${
          active
            ? "text-[#087f6b]"
            : "text-[#7a8984]"
        }`}
      >
        {title}
      </p>
    </div>
  );
}