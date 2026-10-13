"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Facility = {
  id: string;
  name: string;
  district: string | null;
  verification_status: string;
};

type PatientForm = {
  full_name: string;
  nhis_membership_no: string;
  age: string;
  sex: string;
  phone_patient: string;
  phone_caregiver: string;
  community: string;
  landmark: string;
  district: string;
  preferred_language: string;

  diagnosis: string;
  eye: string;
  visual_acuity_re: string;
  visual_acuity_le: string;
  surgical_readiness: string;

  has_htn: boolean;
  has_diabetes: boolean;
  has_allergy: boolean;
  on_anticoagulant: boolean;

  consent_given: boolean;
  consent_method: string;
};

const initialForm: PatientForm = {
  full_name: "",
  nhis_membership_no: "",
  age: "",
  sex: "",
  phone_patient: "",
  phone_caregiver: "",
  community: "",
  landmark: "",
  district: "",
  preferred_language: "English",

  diagnosis: "",
  eye: "",
  visual_acuity_re: "",
  visual_acuity_le: "",
  surgical_readiness: "",

  has_htn: false,
  has_diabetes: false,
  has_allergy: false,
  on_anticoagulant: false,

  consent_given: false,
  consent_method: "verbal",
};

const visualAcuityOptions = [
  "6/6",
  "6/9",
  "6/12",
  "6/15",
  "6/18",
  "6/24",
  "6/36",
  "6/60",
  "CF",
  "HM",
  "NPL",
];

const steps = [
  {
    number: 1,
    title: "Quick Patient Add",
    short: "Patient",
  },
  {
    number: 2,
    title: "Clinical Snapshot",
    short: "Clinical",
  },
  {
    number: 3,
    title: "Consent & Review",
    short: "Consent",
  },
];

export default function PatientsPage() {
  const [step, setStep] = useState(1);

  const [form, setForm] = useState<PatientForm>(initialForm);

  const [facility, setFacility] = useState<Facility | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const [duplicateChecked, setDuplicateChecked] = useState(false);
  const [duplicateFound, setDuplicateFound] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadPage() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      setUserId(session.user.id);

      const { data: memberships, error: membershipError } =
        await supabase
          .from("facility_staff")
          .select("facility_id")
          .eq("user_id", session.user.id)
          .eq("is_active", true);

      if (membershipError) {
        console.error(membershipError);
        setError(
          "We could not load your facility membership."
        );
        setLoading(false);
        return;
      }

      if (!memberships || memberships.length === 0) {
        setLoading(false);
        return;
      }

      const facilityId = memberships[0].facility_id;

      const { data: facilityData, error: facilityError } =
        await supabase
          .from("facilities")
          .select(
            "id, name, district, verification_status"
          )
          .eq("id", facilityId)
          .single();

      if (facilityError) {
        console.error(facilityError);
        setError("We could not load your facility.");
        setLoading(false);
        return;
      }

      setFacility(facilityData);

      setForm((current) => ({
        ...current,
        district: facilityData.district || "",
      }));

      setLoading(false);
    }

    loadPage();
  }, []);

  const progress = useMemo(() => {
    return ((step - 1) / (steps.length - 1)) * 100;
  }, [step]);

  function updateField(
    field: keyof PatientForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (
      field === "nhis_membership_no" ||
      field === "eye"
    ) {
      setDuplicateChecked(false);
      setDuplicateFound(false);
    }
  }

  async function checkDuplicate(showMessage = true) {
    setError("");

    if (!form.nhis_membership_no.trim()) {
      setError(
        "Enter the patient's NHIS membership number first."
      );
      return false;
    }

    if (!form.eye) {
      setError(
        "Select the affected eye before checking for duplication."
      );
      return false;
    }

    setCheckingDuplicate(true);

    const { data, error } = await supabase.rpc(
      "check_patient_duplicate",
      {
        p_nhis: form.nhis_membership_no.trim(),
        p_eye: form.eye,
      }
    );

    setCheckingDuplicate(false);

    if (error) {
      console.error(error);
      setError("The duplicate check could not be completed.");
      return false;
    }

    setDuplicateChecked(true);

    if (data === true) {
      setDuplicateFound(true);

      setError(
        "Duplicate detected: this NHIS membership number already has a record for the selected eye."
      );

      return false;
    }

    setDuplicateFound(false);

    if (showMessage) {
      setError("");
    }

    return true;
  }

  function validateStep() {
    setError("");

    if (step === 1) {
      if (!form.full_name.trim()) {
        setError("Please enter the patient's full name.");
        return false;
      }

      if (!form.nhis_membership_no.trim()) {
        setError(
          "Please enter the NHIS membership number."
        );
        return false;
      }

      if (!form.age) {
        setError("Please enter the patient's age.");
        return false;
      }

      if (!form.sex) {
        setError("Please select the patient's sex.");
        return false;
      }

      if (!form.phone_patient.trim()) {
        setError(
          "Please enter the patient's phone number."
        );
        return false;
      }

      if (!form.community.trim()) {
        setError(
          "Please enter the patient's community."
        );
        return false;
      }

      if (!form.preferred_language) {
        setError(
          "Please select the patient's preferred language."
        );
        return false;
      }
    }

    if (step === 2) {
      if (!form.diagnosis) {
        setError("Please select a diagnosis.");
        return false;
      }

      if (!form.eye) {
        setError("Please select the affected eye.");
        return false;
      }

      if (
        (form.eye === "RE" || form.eye === "Both") &&
        !form.visual_acuity_re
      ) {
        setError(
          "Please select visual acuity for the right eye."
        );
        return false;
      }

      if (
        (form.eye === "LE" || form.eye === "Both") &&
        !form.visual_acuity_le
      ) {
        setError(
          "Please select visual acuity for the left eye."
        );
        return false;
      }

      if (!form.surgical_readiness) {
        setError(
          "Please select the patient's surgical readiness."
        );
        return false;
      }
    }

    if (step === 3) {
      if (!form.consent_given) {
        setError(
          "Patient consent must be recorded before submission."
        );
        return false;
      }

      if (!form.consent_method) {
        setError("Please select the consent method.");
        return false;
      }
    }

    return true;
  }

  async function goNext() {
    if (!validateStep()) {
      return;
    }

    if (step === 2) {
      const clear = await checkDuplicate(false);

      if (!clear) {
        return;
      }
    }

    if (step < 3) {
      setStep((current) => current + 1);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  function goBack() {
    setError("");

    if (step > 1) {
      setStep((current) => current - 1);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    window.location.href = "/dashboard";
  }

  async function submitPatient() {
    setError("");

    if (!validateStep()) {
      return;
    }

    if (!facility || !userId) {
      setError(
        "Your user or facility information could not be verified."
      );
      return;
    }

    setSubmitting(true);

    const duplicateClear = await checkDuplicate(false);

    if (!duplicateClear) {
      setSubmitting(false);
      return;
    }

    const { data: patient, error: patientError } =
      await supabase
        .from("patients")
        .insert({
          facility_id: facility.id,

          full_name: form.full_name.trim(),

          nhis_membership_no:
            form.nhis_membership_no.trim(),

          age: Number(form.age),

          sex: form.sex,

          phone_patient:
            form.phone_patient.trim(),

          phone_caregiver:
            form.phone_caregiver.trim() || null,

          community: form.community.trim(),

          landmark:
            form.landmark.trim() || null,

          district:
            form.district.trim() ||
            facility.district ||
            null,

          preferred_language:
            form.preferred_language,

          // External NHIS validation is not integrated yet.
          nhis_status: "unchecked",

          created_by: userId,
        })
        .select("id")
        .single();

    if (patientError || !patient) {
      console.error(patientError);

      setError(
        patientError?.message ||
          "The patient could not be created."
      );

      setSubmitting(false);
      return;
    }

    const { error: clinicalError } = await supabase
      .from("patient_clinical_records")
      .insert({
        patient_id: patient.id,

        diagnosis: form.diagnosis,

        eye: form.eye,

        visual_acuity_re:
          form.eye === "LE"
            ? null
            : form.visual_acuity_re || null,

        visual_acuity_le:
          form.eye === "RE"
            ? null
            : form.visual_acuity_le || null,

        surgical_readiness:
          form.surgical_readiness,

        has_htn: form.has_htn,
        has_diabetes: form.has_diabetes,
        has_allergy: form.has_allergy,
        on_anticoagulant:
          form.on_anticoagulant,

        created_by: userId,
      });

    if (clinicalError) {
      console.error(clinicalError);

      await supabase
        .from("patients")
        .delete()
        .eq("id", patient.id);

      setError(
        "The clinical record could not be saved. The patient registration was cancelled."
      );

      setSubmitting(false);
      return;
    }

    const { error: consentError } = await supabase
      .from("patient_consents")
      .insert({
        patient_id: patient.id,

        consent_given:
          form.consent_given,

        consent_method:
          form.consent_method,

        consented_at:
          new Date().toISOString(),

        recorded_by: userId,
      });

    if (consentError) {
      console.error(consentError);

      await supabase
        .from("patients")
        .delete()
        .eq("id", patient.id);

      setError(
        "Consent could not be saved. The patient registration was cancelled."
      );

      setSubmitting(false);
      return;
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        user_id: userId,

        action: "patient_registered",

        entity_type: "patient",

        entity_id: patient.id,

        details: {
          facility_id: facility.id,
          diagnosis: form.diagnosis,
          eye: form.eye,
          surgical_readiness:
            form.surgical_readiness,
          nhis_status: "unchecked",
        },
      });

    if (auditError) {
      console.error(
        "Audit log error:",
        auditError
      );
    }

    setSubmitting(false);
    setSuccess(true);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#cce9df] border-t-[#087f6b]" />

          <p className="mt-4 text-sm font-medium text-[#65756f]">
            Loading patient registration...
          </p>
        </div>
      </main>
    );
  }

  if (!facility) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] px-5">
        <div className="w-full max-w-lg rounded-3xl border border-[#dfe9e5] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4dc] text-[#a36c00]">
            !
          </div>

          <h1 className="mt-5 text-2xl font-bold text-[#10233c]">
            Facility setup required
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#65756f]">
            You must be linked to a SurgiCare facility before
            registering patients.
          </p>

          <button
            onClick={() => {
              window.location.href = "/facility";
            }}
            className="mt-7 w-full rounded-xl bg-[#087f6b] px-5 py-3.5 font-semibold text-white transition hover:bg-[#056554]"
          >
            Set up facility
          </button>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] px-5">
        <div className="w-full max-w-xl rounded-3xl border border-[#dfe9e5] bg-white p-8 text-center shadow-sm md:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f6f1] text-[#087f6b]">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#087f6b]">
            Patient registered
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#10233c]">
            Added to the outreach pool
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#65756f]">
            {form.full_name} has been registered successfully
            and is now available for future SurgiCare outreach
            planning.
          </p>

          <div className="mt-7 rounded-2xl border border-[#cce9df] bg-[#eef9f5] p-5 text-left">
            <p className="text-sm font-semibold text-[#08705f]">
              Clinical status
            </p>

            <div className="mt-3 space-y-2 text-sm text-[#52635d]">
              <p>
                Diagnosis:{" "}
                <strong>{form.diagnosis}</strong>
              </p>

              <p>
                Eye: <strong>{form.eye}</strong>
              </p>

              <p>
                Readiness:{" "}
                <strong>
                  {form.surgical_readiness}
                </strong>
              </p>

              <p>
                NHIS:{" "}
                <strong>
                  Pending external verification
                </strong>
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                setForm({
                  ...initialForm,
                  district:
                    facility.district || "",
                });

                setStep(1);
                setDuplicateChecked(false);
                setDuplicateFound(false);
                setError("");
                setSuccess(false);
              }}
              className="rounded-xl bg-[#087f6b] px-5 py-3.5 font-semibold text-white transition hover:bg-[#056554]"
            >
              Add another patient
            </button>

            <button
              onClick={() => {
                window.location.href =
                  "/dashboard";
              }}
              className="rounded-xl border border-[#dfe9e5] bg-white px-5 py-3.5 font-semibold text-[#52635d] transition hover:bg-[#f6faf8]"
            >
              Return to dashboard
            </button>
          </div>
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
            onClick={() => {
              window.location.href =
                "/dashboard";
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
                Quick Patient Add
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              window.location.href =
                "/dashboard";
            }}
            className="rounded-lg border border-[#dfe9e5] px-4 py-2 text-sm font-semibold text-[#52635d] hover:bg-[#f6faf8]"
          >
            Exit
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-7 md:px-8">
        {/* FACILITY */}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe9e5] bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
              Registering at
            </p>

            <p className="mt-1 font-bold text-[#10233c]">
              {facility.name}
            </p>

            {facility.district && (
              <p className="mt-1 text-xs text-[#65756f]">
                {facility.district}
              </p>
            )}
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              facility.verification_status ===
              "approved"
                ? "bg-[#e7f6f1] text-[#087f6b]"
                : "bg-[#fff7df] text-[#946900]"
            }`}
          >
            {facility.verification_status ===
            "approved"
              ? "Facility verified"
              : "Verification pending"}
          </span>
        </div>

        {/* HERO */}

        <section className="mt-8">
          <p className="text-sm font-semibold text-[#087f6b]">
            Patient booking
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#10233c]">
            Add a patient
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65756f]">
            Capture the essential patient and clinical information
            needed for SurgiCare outreach planning.
          </p>
        </section>

        {/* PROGRESS */}

        <section className="mt-7">
          <div className="relative">
            <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-[#e1ebe7]" />

            <div
              className="absolute left-0 top-5 h-1 rounded-full bg-[#087f6b] transition-all duration-300"
              style={{
                width: `${progress}%`,
              }}
            />

            <div className="relative grid grid-cols-3">
              {steps.map((item) => {
                const completed =
                  step > item.number;

                const active =
                  step === item.number;

                return (
                  <div
                    key={item.number}
                    className="flex flex-col items-center"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-4 border-[#f6faf8] text-sm font-bold ${
                        completed || active
                          ? "bg-[#087f6b] text-white"
                          : "bg-[#dde8e4] text-[#73827d]"
                      }`}
                    >
                      {completed
                        ? "✓"
                        : item.number}
                    </div>

                    <p
                      className={`mt-2 text-xs font-semibold ${
                        active
                          ? "text-[#087f6b]"
                          : "text-[#74847e]"
                      }`}
                    >
                      {item.short}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FORM */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#dfe9e5] bg-white shadow-sm">
          <div className="border-b border-[#e7efec] px-6 py-6 md:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087f6b]">
              Step {step} of 3
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#10233c]">
              {steps[step - 1].title}
            </h2>
          </div>

          <div className="p-6 md:p-8">
            {/* STEP 1 */}

            {step === 1 && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Field
                    label="Full name"
                    required
                  >
                    <input
                      value={form.full_name}
                      onChange={(e) =>
                        updateField(
                          "full_name",
                          e.target.value
                        )
                      }
                      placeholder="Patient full name"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field
                  label="NHIS Membership No."
                  required
                >
                  <input
                    value={
                      form.nhis_membership_no
                    }
                    onChange={(e) =>
                      updateField(
                        "nhis_membership_no",
                        e.target.value
                      )
                    }
                    placeholder="Enter NHIS number"
                    className={inputClass}
                  />

                  <p className="mt-2 text-xs leading-5 text-[#65756f]">
                    NHIS verification will run
                    separately once the external
                    verification service is connected.
                  </p>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Age" required>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={form.age}
                      onChange={(e) =>
                        updateField(
                          "age",
                          e.target.value
                        )
                      }
                      placeholder="Age"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Sex" required>
                    <select
                      value={form.sex}
                      onChange={(e) =>
                        updateField(
                          "sex",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">
                        Select
                      </option>

                      <option value="M">
                        Male
                      </option>

                      <option value="F">
                        Female
                      </option>
                    </select>
                  </Field>
                </div>

                <Field
                  label="Patient phone"
                  required
                >
                  <input
                    type="tel"
                    value={
                      form.phone_patient
                    }
                    onChange={(e) =>
                      updateField(
                        "phone_patient",
                        e.target.value
                      )
                    }
                    placeholder="+233..."
                    className={inputClass}
                  />
                </Field>

                <Field label="Caregiver phone">
                  <input
                    type="tel"
                    value={
                      form.phone_caregiver
                    }
                    onChange={(e) =>
                      updateField(
                        "phone_caregiver",
                        e.target.value
                      )
                    }
                    placeholder="+233..."
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Community"
                  required
                >
                  <input
                    value={form.community}
                    onChange={(e) =>
                      updateField(
                        "community",
                        e.target.value
                      )
                    }
                    placeholder="Community"
                    className={inputClass}
                  />
                </Field>

                <Field label="Landmark">
                  <input
                    value={form.landmark}
                    onChange={(e) =>
                      updateField(
                        "landmark",
                        e.target.value
                      )
                    }
                    placeholder="Nearby landmark"
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
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Language for calls"
                  required
                >
                  <select
                    value={
                      form.preferred_language
                    }
                    onChange={(e) =>
                      updateField(
                        "preferred_language",
                        e.target.value
                      )
                    }
                    className={inputClass}
                  >
                    <option value="English">
                      English
                    </option>

                    <option value="Twi">
                      Twi
                    </option>

                    <option value="Ewe">
                      Ewe
                    </option>

                    <option value="Ga">
                      Ga
                    </option>

                    <option value="Dagbani">
                      Dagbani
                    </option>
                  </select>
                </Field>
              </div>
            )}

            {/* STEP 2 */}

            {step === 2 && (
              <div>
                <div className="grid gap-6 md:grid-cols-2">
                  <Field
                    label="Diagnosis"
                    required
                  >
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        "Cataract",
                        "Pterygium",
                        "Both",
                      ].map((option) => (
                        <ChoiceButton
                          key={option}
                          label={option}
                          selected={
                            form.diagnosis ===
                            option
                          }
                          onClick={() =>
                            updateField(
                              "diagnosis",
                              option
                            )
                          }
                        />
                      ))}
                    </div>
                  </Field>

                  <Field
                    label="Affected eye"
                    required
                  >
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        ["RE", "Right"],
                        ["LE", "Left"],
                        ["Both", "Both"],
                      ].map(
                        ([value, label]) => (
                          <ChoiceButton
                            key={value}
                            label={label}
                            selected={
                              form.eye === value
                            }
                            onClick={() =>
                              updateField(
                                "eye",
                                value
                              )
                            }
                          />
                        )
                      )}
                    </div>
                  </Field>
                </div>

                <div className="mt-7 grid gap-6 md:grid-cols-2">
                  {(form.eye === "RE" ||
                    form.eye === "Both" ||
                    !form.eye) && (
                    <Field label="Visual acuity — Right eye">
                      <select
                        value={
                          form.visual_acuity_re
                        }
                        onChange={(e) =>
                          updateField(
                            "visual_acuity_re",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Select visual acuity
                        </option>

                        {visualAcuityOptions.map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          )
                        )}
                      </select>
                    </Field>
                  )}

                  {(form.eye === "LE" ||
                    form.eye === "Both" ||
                    !form.eye) && (
                    <Field label="Visual acuity — Left eye">
                      <select
                        value={
                          form.visual_acuity_le
                        }
                        onChange={(e) =>
                          updateField(
                            "visual_acuity_le",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Select visual acuity
                        </option>

                        {visualAcuityOptions.map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          )
                        )}
                      </select>
                    </Field>
                  )}
                </div>

                <div className="mt-8">
                  <Field
                    label="Surgical readiness"
                    required
                  >
                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        "Ready Now",
                        "Needs Biometry",
                        "Needs BP/Diabetes control",
                      ].map((option) => (
                        <ChoiceButton
                          key={option}
                          label={option}
                          selected={
                            form.surgical_readiness ===
                            option
                          }
                          onClick={() =>
                            updateField(
                              "surgical_readiness",
                              option
                            )
                          }
                        />
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="mt-8">
                  <p className="text-sm font-semibold text-[#10233c]">
                    Comorbidity flags
                  </p>

                  <p className="mt-1 text-xs text-[#65756f]">
                    Select all that apply.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <CheckOption
                      label="Hypertension"
                      checked={
                        form.has_htn
                      }
                      onChange={(value) =>
                        updateField(
                          "has_htn",
                          value
                        )
                      }
                    />

                    <CheckOption
                      label="Diabetes"
                      checked={
                        form.has_diabetes
                      }
                      onChange={(value) =>
                        updateField(
                          "has_diabetes",
                          value
                        )
                      }
                    />

                    <CheckOption
                      label="Allergy"
                      checked={
                        form.has_allergy
                      }
                      onChange={(value) =>
                        updateField(
                          "has_allergy",
                          value
                        )
                      }
                    />

                    <CheckOption
                      label="Anticoagulant"
                      checked={
                        form.on_anticoagulant
                      }
                      onChange={(value) =>
                        updateField(
                          "on_anticoagulant",
                          value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-[#dfe9e5] bg-[#f8fbfa] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#10233c]">
                        Duplicate check
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#65756f]">
                        Checks whether this NHIS
                        number already has a record
                        for the selected eye.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        checkingDuplicate ||
                        !form.eye ||
                        !form.nhis_membership_no
                      }
                      onClick={() =>
                        checkDuplicate()
                      }
                      className="rounded-xl border border-[#87c9b7] bg-white px-4 py-2.5 text-sm font-semibold text-[#087f6b] transition hover:bg-[#edf8f4] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {checkingDuplicate
                        ? "Checking..."
                        : "Check duplicate"}
                    </button>
                  </div>

                  {duplicateChecked &&
                    !duplicateFound && (
                      <div className="mt-4 rounded-xl bg-[#e7f6f1] px-4 py-3 text-sm font-medium text-[#08705f]">
                        ✓ No duplicate found for
                        this NHIS number and eye.
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* STEP 3 */}

            {step === 3 && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#dfe9e5] bg-[#f8fbfa] p-5">
                  <h3 className="font-bold text-[#10233c]">
                    Patient
                  </h3>

                  <ReviewRow
                    label="Name"
                    value={form.full_name}
                  />

                  <ReviewRow
                    label="NHIS"
                    value={
                      form.nhis_membership_no
                    }
                  />

                  <ReviewRow
                    label="Age / Sex"
                    value={`${form.age} / ${
                      form.sex === "M"
                        ? "Male"
                        : "Female"
                    }`}
                  />

                  <ReviewRow
                    label="Community"
                    value={form.community}
                  />

                  <ReviewRow
                    label="Language"
                    value={
                      form.preferred_language
                    }
                  />
                </div>

                <div className="rounded-2xl border border-[#dfe9e5] bg-[#f8fbfa] p-5">
                  <h3 className="font-bold text-[#10233c]">
                    Clinical snapshot
                  </h3>

                  <ReviewRow
                    label="Diagnosis"
                    value={form.diagnosis}
                  />

                  <ReviewRow
                    label="Eye"
                    value={form.eye}
                  />

                  {form.eye !== "LE" && (
                    <ReviewRow
                      label="VA Right"
                      value={
                        form.visual_acuity_re
                      }
                    />
                  )}

                  {form.eye !== "RE" && (
                    <ReviewRow
                      label="VA Left"
                      value={
                        form.visual_acuity_le
                      }
                    />
                  )}

                  <ReviewRow
                    label="Readiness"
                    value={
                      form.surgical_readiness
                    }
                  />
                </div>

                <div className="rounded-2xl border border-[#dfe9e5] bg-white p-5">
                  <h3 className="font-bold text-[#10233c]">
                    Patient consent
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#65756f]">
                    Confirm that the patient has
                    consented to their information
                    being recorded for SurgiCare
                    outreach coordination.
                  </p>

                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#dfe9e5] p-4">
                    <input
                      type="checkbox"
                      checked={
                        form.consent_given
                      }
                      onChange={(e) =>
                        updateField(
                          "consent_given",
                          e.target.checked
                        )
                      }
                      className="mt-1 h-4 w-4 accent-[#087f6b]"
                    />

                    <div>
                      <p className="text-sm font-semibold text-[#10233c]">
                        Consent obtained
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#65756f]">
                        I confirm that patient
                        consent has been obtained
                        and recorded appropriately.
                      </p>
                    </div>
                  </label>

                  <div className="mt-5">
                    <Field label="Consent method">
                      <select
                        value={
                          form.consent_method
                        }
                        onChange={(e) =>
                          updateField(
                            "consent_method",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="verbal">
                          Verbal
                        </option>

                        <option value="written">
                          Written
                        </option>

                        <option value="digital">
                          Digital
                        </option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#f1dfae] bg-[#fff9e8] p-5">
                  <p className="text-sm font-semibold text-[#7f6200]">
                    NHIS verification pending
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#826f32]">
                    SurgiCare is not yet connected
                    to an external NHIS validation
                    service. This registration will
                    therefore be stored with NHIS
                    status set to unchecked.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-7 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* ACTIONS */}

          <div className="flex items-center justify-between border-t border-[#e7efec] px-6 py-5 md:px-8">
            <button
              onClick={goBack}
              className="rounded-xl border border-[#dfe9e5] bg-white px-5 py-3 text-sm font-semibold text-[#52635d] transition hover:bg-[#f6faf8]"
            >
              {step === 1
                ? "Back to dashboard"
                : "Back"}
            </button>

            {step < 3 ? (
              <button
                onClick={goNext}
                className="rounded-xl bg-[#087f6b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#056554]"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={submitPatient}
                disabled={submitting}
                className="rounded-xl bg-[#087f6b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#056554] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Adding patient..."
                  : "Add patient to pool"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#dfe9e5] bg-white px-4 py-3.5 text-sm text-[#10231f] outline-none transition placeholder:text-slate-400 focus:border-[#087f6b] focus:ring-4 focus:ring-[#087f6b]/10";

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
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
        selected
          ? "border-[#087f6b] bg-[#e7f6f1] text-[#087f6b]"
          : "border-[#dfe9e5] bg-white text-[#52635d] hover:bg-[#f8fbfa]"
      }`}
    >
      {label}
    </button>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
        checked
          ? "border-[#87c9b7] bg-[#edf8f4]"
          : "border-[#dfe9e5] bg-white"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
          checked
            ? "border-[#087f6b] bg-[#087f6b] text-white"
            : "border-[#aebdb8] bg-white"
        }`}
      >
        {checked ? "✓" : ""}
      </span>

      <span className="text-sm font-semibold text-[#10233c]">
        {label}
      </span>
    </button>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-3 flex items-start justify-between gap-4 border-t border-[#e3ece8] pt-3 first:border-0">
      <span className="text-sm text-[#65756f]">
        {label}
      </span>

      <span className="max-w-[60%] text-right text-sm font-semibold text-[#10233c]">
        {value || "Not provided"}
      </span>
    </div>
  );
}