"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const OFFLINE_ACCESS_KEY =
  "surgicare_offline_booking_access";

const OFFLINE_QUEUE_KEY =
  "surgicare_offline_booking_queue";

type BookingForm = {
  clinician_name: string;

  nhis_membership_no: string;
  nhis_status: string;

  full_name: string;
  age: string;
  sex: string;

  phone_patient: string;
  phone_caregiver: string;

  community: string;
  landmark: string;
  district: string;

  preferred_language: string;

  diagnosis: string;
  affected_eye: string;

  visual_acuity_right: string;
  visual_acuity_left: string;

  surgical_readiness: string;

  comorbidities: string;

  consent_given: boolean;
};

type OfflineAccess = {
  facilityId: string;
  facilityName: string;
  facilityCode: string;
  token: string;
  expiresAt: string;
};

type QueuedBooking = {
  clientBookingId: string;
  facilityCode: string;
  createdAt: string;
  form: BookingForm;
  lastError?: string;
};

const initialForm: BookingForm = {
  clinician_name: "",

  nhis_membership_no: "",
  nhis_status: "unchecked",

  full_name: "",
  age: "",
  sex: "",

  phone_patient: "",
  phone_caregiver: "",

  community: "",
  landmark: "",
  district: "",

  preferred_language: "English",

  diagnosis: "",
  affected_eye: "",

  visual_acuity_right: "",
  visual_acuity_left: "",

  surgical_readiness: "",

  comorbidities: "",

  consent_given: false,
};

export default function BookPatientPage() {
  const [step, setStep] =
    useState<1 | 2>(1);

  const [facilityCode, setFacilityCode] =
    useState("");

  const [facilityPin, setFacilityPin] =
    useState("");

  const [facilityName, setFacilityName] =
    useState("");

  const [
    facilityVerified,
    setFacilityVerified,
  ] = useState(false);

  const [
    offlineAccessReady,
    setOfflineAccessReady,
  ] = useState(false);

  const [form, setForm] =
    useState<BookingForm>(
      initialForm
    );

  const [isOnline, setIsOnline] =
    useState(true);

  const [
    pendingBookings,
    setPendingBookings,
  ] = useState(0);

  const [
    checkingFacility,
    setCheckingFacility,
  ] = useState(false);

  const [
    checkingNhIS,
    setCheckingNhIS,
  ] = useState(false);

  const [
    returningPatient,
    setReturningPatient,
  ] = useState(false);

  const [
    duplicateWarning,
    setDuplicateWarning,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [syncing, setSyncing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  // ==========================================================
  // INITIALIZE
  // ==========================================================

  useEffect(() => {
    async function initialize() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        window.location.href =
          "/login";

        return;
      }

      const online =
        navigator.onLine;

      setIsOnline(online);

      loadOfflineAccess();
      loadQueueCount();

      if (online) {
        window.setTimeout(
          () => {
            syncPendingBookings();
          },
          500
        );
      }
    }

    initialize();

    function handleOnline() {
      setIsOnline(true);

      setMessage(
        "Internet connection restored. Checking queued bookings..."
      );

      window.setTimeout(
        () => {
          syncPendingBookings();
        },
        500
      );
    }

    function handleOffline() {
      setIsOnline(false);

      setMessage(
        "You are offline. Completed bookings will be saved securely on this device and synced when connectivity returns."
      );
    }

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  // ==========================================================
  // LOCAL STORAGE
  // ==========================================================

  function getStoredAccess():
    | OfflineAccess
    | null {
    try {
      const raw =
        localStorage.getItem(
          OFFLINE_ACCESS_KEY
        );

      if (!raw) {
        return null;
      }

      const access =
        JSON.parse(
          raw
        ) as OfflineAccess;

      const expires =
        new Date(
          access.expiresAt
        ).getTime();

      if (
        !expires ||
        expires <= Date.now()
      ) {
        localStorage.removeItem(
          OFFLINE_ACCESS_KEY
        );

        return null;
      }

      return access;
    } catch {
      localStorage.removeItem(
        OFFLINE_ACCESS_KEY
      );

      return null;
    }
  }

  function loadOfflineAccess() {
    const access =
      getStoredAccess();

    if (!access) {
      setOfflineAccessReady(
        false
      );

      return;
    }

    setFacilityCode(
      access.facilityCode
    );

    setFacilityName(
      access.facilityName
    );

    setFacilityVerified(true);
    setOfflineAccessReady(true);
  }

  function getQueue():
    QueuedBooking[] {
    try {
      const raw =
        localStorage.getItem(
          OFFLINE_QUEUE_KEY
        );

      if (!raw) {
        return [];
      }

      const parsed =
        JSON.parse(raw);

      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  function saveQueue(
    queue: QueuedBooking[]
  ) {
    localStorage.setItem(
      OFFLINE_QUEUE_KEY,
      JSON.stringify(queue)
    );

    setPendingBookings(
      queue.length
    );
  }

  function loadQueueCount() {
    setPendingBookings(
      getQueue().length
    );
  }

  // ==========================================================
  // FORM
  // ==========================================================

  function updateField(
    field: keyof BookingForm,
    value: string | boolean
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  // ==========================================================
  // FACILITY VERIFICATION
  // ==========================================================

  async function verifyFacility() {
    setError("");
    setMessage("");

    if (!navigator.onLine) {
      const access =
        getStoredAccess();

      if (access) {
        setFacilityVerified(
          true
        );

        setOfflineAccessReady(
          true
        );

        setFacilityCode(
          access.facilityCode
        );

        setFacilityName(
          access.facilityName
        );

        setMessage(
          `Offline access active for ${access.facilityName}.`
        );

        return;
      }

      setError(
        "This device must verify the facility once while online before offline booking can be used."
      );

      return;
    }

    if (
      !facilityCode.trim() ||
      !facilityPin.trim()
    ) {
      setError(
        "Enter the facility code and 4-digit PIN."
      );

      return;
    }

    if (
      !/^\d{4}$/.test(
        facilityPin.trim()
      )
    ) {
      setError(
        "Facility PIN must be exactly 4 digits."
      );

      return;
    }

    setCheckingFacility(true);

    // ----------------------------------------------------------
    // VERIFY FACILITY
    // ----------------------------------------------------------

    const {
      data,
      error,
    } = await supabase.rpc(
      "resolve_facility_access",
      {
        p_facility_code:
          facilityCode.trim(),

        p_pin:
          facilityPin.trim(),
      }
    );

    if (error) {
      console.error(error);

      setFacilityVerified(
        false
      );

      setError(
        error.message
      );

      setCheckingFacility(
        false
      );

      return;
    }

    if (
      !data ||
      data.length === 0
    ) {
      setError(
        "SurgiCare could not verify this facility."
      );

      setCheckingFacility(
        false
      );

      return;
    }

    // ----------------------------------------------------------
    // ISSUE OFFLINE DEVICE TOKEN
    // ----------------------------------------------------------

    const {
      data: tokenData,
      error: tokenError,
    } = await supabase.rpc(
      "issue_offline_booking_token",
      {
        p_facility_code:
          facilityCode.trim(),

        p_pin:
          facilityPin.trim(),
      }
    );

    if (tokenError) {
      console.error(
        tokenError
      );

      setError(
        tokenError.message
      );

      setCheckingFacility(
        false
      );

      return;
    }

    if (
      !tokenData ||
      tokenData.length === 0
    ) {
      setError(
        "Facility verified, but SurgiCare could not prepare offline booking access."
      );

      setCheckingFacility(
        false
      );

      return;
    }

    const token =
      tokenData[0];

    const access: OfflineAccess =
      {
        facilityId:
          token.facility_id,

        facilityName:
          token.facility_name,

        facilityCode:
          token.facility_code,

        token:
          token.offline_token,

        expiresAt:
          token.expires_at,
      };

    localStorage.setItem(
      OFFLINE_ACCESS_KEY,
      JSON.stringify(
        access
      )
    );

    // IMPORTANT:
    // Do NOT persist facilityPin.

    setFacilityPin("");

    setFacilityCode(
      access.facilityCode
    );

    setFacilityName(
      access.facilityName
    );

    setFacilityVerified(true);

    setOfflineAccessReady(
      true
    );

    setMessage(
      `Facility verified: ${access.facilityName}. Offline booking is enabled on this device.`
    );

    setCheckingFacility(false);

    await syncPendingBookings();
  }

  // ==========================================================
  // NHIS LOOKUP
  // ==========================================================

  async function lookupNhIS() {
    setError("");
    setMessage("");
    setReturningPatient(
      false
    );

    if (!facilityVerified) {
      setError(
        "Verify the facility before looking up a patient."
      );

      return;
    }

    if (!navigator.onLine) {
      setError(
        "NHIS returning-patient lookup requires an internet connection. You can still complete a new offline booking."
      );

      return;
    }

    if (
      !form.nhis_membership_no.trim()
    ) {
      setError(
        "Enter the patient's NHIS number first."
      );

      return;
    }

    const access =
      getStoredAccess();

    // Lookup currently requires PIN.
    // Since we intentionally do not save PIN,
    // ask for verification again if the PIN
    // is no longer present in memory.

    if (
      !facilityPin.trim()
    ) {
      setError(
        "For an online NHIS lookup, enter the facility PIN again and verify the facility."
      );

      return;
    }

    setCheckingNhIS(true);

    const {
      data,
      error,
    } = await supabase.rpc(
      "lookup_returning_patient",
      {
        p_facility_code:
          access?.facilityCode ||
          facilityCode,

        p_pin:
          facilityPin,

        p_nhis_membership_no:
          form.nhis_membership_no.trim(),
      }
    );

    if (error) {
      console.error(error);

      setError(
        error.message
      );

      setCheckingNhIS(false);

      return;
    }

    if (
      !data ||
      data.length === 0
    ) {
      setMessage(
        "No existing SurgiCare patient found with this NHIS number. Continue with a new booking."
      );

      setCheckingNhIS(false);

      return;
    }

    const patient =
      data[0];

    setForm(
      (current) => ({
        ...current,

        full_name:
          patient.full_name ||
          "",

        age:
          patient.age !==
            null &&
          patient.age !==
            undefined
            ? String(
                patient.age
              )
            : "",

        sex:
          patient.sex || "",

        phone_patient:
          patient.phone_patient ||
          "",

        phone_caregiver:
          patient.phone_caregiver ||
          "",

        community:
          patient.community ||
          "",

        landmark:
          patient.landmark ||
          "",

        district:
          patient.district ||
          "",

        preferred_language:
          patient.preferred_language ||
          "English",

        nhis_status:
          patient.nhis_status ||
          "unchecked",
      })
    );

    setReturningPatient(
      true
    );

    setMessage(
      "Returning patient found. Existing demographic information has been filled automatically."
    );

    setCheckingNhIS(false);
  }

  // ==========================================================
  // STEP VALIDATION
  // ==========================================================

  function validatePatientDetails() {
    if (!facilityVerified) {
      setError(
        "Verify the facility before continuing."
      );

      return false;
    }

    if (
      !form.clinician_name.trim()
    ) {
      setError(
        "Enter the clinician's name."
      );

      return false;
    }

    if (
      !form.full_name.trim()
    ) {
      setError(
        "Enter the patient's full name."
      );

      return false;
    }

    const age =
      Number(form.age);

    if (
      !form.age ||
      Number.isNaN(age) ||
      age < 0 ||
      age > 120
    ) {
      setError(
        "Enter a valid patient age."
      );

      return false;
    }

    if (!form.sex) {
      setError(
        "Select the patient's sex."
      );

      return false;
    }

    return true;
  }

  function validateClinicalDetails() {
    if (!form.diagnosis) {
      setError(
        "Select a diagnosis."
      );

      return false;
    }

    if (!form.affected_eye) {
      setError(
        "Select the affected eye."
      );

      return false;
    }

    if (
      !form.surgical_readiness
    ) {
      setError(
        "Select surgical readiness."
      );

      return false;
    }

    if (
      !form.consent_given
    ) {
      setError(
        "Patient consent is required before booking."
      );

      return false;
    }

    return true;
  }

  function goToClinicalStep() {
    setError("");
    setMessage("");

    if (
      !validatePatientDetails()
    ) {
      return;
    }

    setStep(2);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ==========================================================
  // ONLINE DUPLICATE CHECK
  // ==========================================================

  async function checkDuplicateOnline() {
    if (
      !navigator.onLine ||
      !form.nhis_membership_no.trim() ||
      !form.affected_eye
    ) {
      return false;
    }

    if (!facilityPin.trim()) {
      return false;
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "check_patient_duplicate",
      {
        p_facility_code:
          facilityCode,

        p_pin:
          facilityPin,

        p_nhis_membership_no:
          form.nhis_membership_no.trim(),

        p_affected_eye:
          form.affected_eye,
      }
    );

    if (error) {
      console.error(error);

      return false;
    }

    const duplicate =
      Boolean(data);

    setDuplicateWarning(
      duplicate
    );

    return duplicate;
  }

  // ==========================================================
  // QUEUE OFFLINE BOOKING
  // ==========================================================

  function queueOfflineBooking() {
    const access =
      getStoredAccess();

    if (!access) {
      setError(
        "Offline authorization is unavailable or expired. Reconnect and verify the facility again."
      );

      return false;
    }

    const queue =
      getQueue();

    const item: QueuedBooking =
      {
        clientBookingId:
          crypto.randomUUID(),

        facilityCode:
          access.facilityCode,

        createdAt:
          new Date().toISOString(),

        form: {
          ...form,
        },
      };

    queue.push(item);

    saveQueue(queue);

    return true;
  }

  // ==========================================================
  // ONLINE CREATE
  // ==========================================================

  async function createOnlineBooking(
    clientBookingId: string
  ) {
    if (!facilityPin.trim()) {
      throw new Error(
        "PIN_REQUIRED"
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "create_patient_booking",
      {
        p_facility_code:
          facilityCode,

        p_pin:
          facilityPin,

        p_clinician_name:
          form.clinician_name.trim(),

        p_full_name:
          form.full_name.trim(),

        p_nhis_membership_no:
          form.nhis_membership_no.trim() ||
          null,

        p_nhis_status:
          form.nhis_status,

        p_age:
          Number(form.age),

        p_sex:
          form.sex,

        p_phone_patient:
          form.phone_patient.trim() ||
          null,

        p_phone_caregiver:
          form.phone_caregiver.trim() ||
          null,

        p_community:
          form.community.trim() ||
          null,

        p_landmark:
          form.landmark.trim() ||
          null,

        p_district:
          form.district.trim() ||
          null,

        p_preferred_language:
          form.preferred_language,

        p_diagnosis:
          form.diagnosis,

        p_affected_eye:
          form.affected_eye,

        p_visual_acuity_right:
          form.visual_acuity_right.trim() ||
          null,

        p_visual_acuity_left:
          form.visual_acuity_left.trim() ||
          null,

        p_surgical_readiness:
          form.surgical_readiness,

        p_comorbidities:
          form.comorbidities.trim() ||
          null,

        p_consent_given:
          form.consent_given,

        p_client_booking_id:
          clientBookingId,

        p_offline_created:
          false,
      }
    );

    if (error) {
      throw error;
    }

    return data;
  }

  // ==========================================================
  // SUBMIT BOOKING
  // ==========================================================

  async function submitBooking(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setMessage("");
    setDuplicateWarning(
      false
    );

    if (
      !validateClinicalDetails()
    ) {
      return;
    }

    setSaving(true);

    // ----------------------------------------------------------
    // OFFLINE
    // ----------------------------------------------------------

    if (!navigator.onLine) {
      const queued =
        queueOfflineBooking();

      if (!queued) {
        setSaving(false);
        return;
      }

      completeBookingReset();

      setMessage(
        "Patient saved offline. SurgiCare will sync this booking automatically when the connection returns."
      );

      setSaving(false);

      return;
    }

    // ----------------------------------------------------------
    // ONLINE
    // ----------------------------------------------------------

    try {
      const clientBookingId =
        crypto.randomUUID();

      /*
        If the PIN is still available in memory,
        use the normal online booking function.

        If it is not, use the already-issued
        offline authorization token instead.
      */

      if (facilityPin.trim()) {
        const duplicate =
          await checkDuplicateOnline();

        if (duplicate) {
          setError(
            "This NHIS number and affected eye are already in the SurgiCare patient pool."
          );

          setSaving(false);
          return;
        }

        await createOnlineBooking(
          clientBookingId
        );
      } else {
        const access =
          getStoredAccess();

        if (!access) {
          setError(
            "Facility access has expired. Please verify the facility again."
          );

          setSaving(false);
          return;
        }

        const {
          error: syncError,
        } = await supabase.rpc(
          "sync_offline_patient_booking",
          {
            p_offline_token:
              access.token,

            p_client_booking_id:
              clientBookingId,

            p_clinician_name:
              form.clinician_name.trim(),

            p_full_name:
              form.full_name.trim(),

            p_nhis_membership_no:
              form.nhis_membership_no.trim() ||
              null,

            p_nhis_status:
              form.nhis_status,

            p_age:
              Number(form.age),

            p_sex:
              form.sex,

            p_phone_patient:
              form.phone_patient.trim() ||
              null,

            p_phone_caregiver:
              form.phone_caregiver.trim() ||
              null,

            p_community:
              form.community.trim() ||
              null,

            p_landmark:
              form.landmark.trim() ||
              null,

            p_district:
              form.district.trim() ||
              null,

            p_preferred_language:
              form.preferred_language,

            p_diagnosis:
              form.diagnosis,

            p_affected_eye:
              form.affected_eye,

            p_visual_acuity_right:
              form.visual_acuity_right.trim() ||
              null,

            p_visual_acuity_left:
              form.visual_acuity_left.trim() ||
              null,

            p_surgical_readiness:
              form.surgical_readiness,

            p_comorbidities:
              form.comorbidities.trim() ||
              null,

            p_consent_given:
              form.consent_given,
          }
        );

        if (syncError) {
          throw syncError;
        }
      }

      completeBookingReset();

      setMessage(
        "Patient successfully added to the SurgiCare outreach pool."
      );
    } catch (err: any) {
      console.error(err);

      /*
        If connectivity disappeared during
        the request, safely queue the booking.
      */

      if (!navigator.onLine) {
        const queued =
          queueOfflineBooking();

        if (queued) {
          completeBookingReset();

          setMessage(
            "Connection was lost. The patient was saved offline and will sync automatically."
          );

          setSaving(false);
          return;
        }
      }

      setError(
        err?.message ||
          "Unable to save this patient."
      );
    }

    setSaving(false);
  }

  function completeBookingReset() {
    setForm(
      (current) => ({
        ...initialForm,

        clinician_name:
          current.clinician_name,
      })
    );

    setReturningPatient(
      false
    );

    setDuplicateWarning(
      false
    );

    setStep(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ==========================================================
  // AUTO SYNC
  // ==========================================================

  async function syncPendingBookings() {
    if (
      !navigator.onLine ||
      syncing
    ) {
      return;
    }

    const access =
      getStoredAccess();

    if (!access) {
      return;
    }

    const queue =
      getQueue();

    if (queue.length === 0) {
      setPendingBookings(0);
      return;
    }

    setSyncing(true);

    const remaining:
      QueuedBooking[] = [];

    let successful = 0;

    for (const item of queue) {
      try {
        const {
          error,
        } = await supabase.rpc(
          "sync_offline_patient_booking",
          {
            p_offline_token:
              access.token,

            p_client_booking_id:
              item.clientBookingId,

            p_clinician_name:
              item.form.clinician_name,

            p_full_name:
              item.form.full_name,

            p_nhis_membership_no:
              item.form.nhis_membership_no ||
              null,

            p_nhis_status:
              item.form.nhis_status,

            p_age:
              Number(
                item.form.age
              ),

            p_sex:
              item.form.sex,

            p_phone_patient:
              item.form.phone_patient ||
              null,

            p_phone_caregiver:
              item.form.phone_caregiver ||
              null,

            p_community:
              item.form.community ||
              null,

            p_landmark:
              item.form.landmark ||
              null,

            p_district:
              item.form.district ||
              null,

            p_preferred_language:
              item.form.preferred_language,

            p_diagnosis:
              item.form.diagnosis,

            p_affected_eye:
              item.form.affected_eye,

            p_visual_acuity_right:
              item.form.visual_acuity_right ||
              null,

            p_visual_acuity_left:
              item.form.visual_acuity_left ||
              null,

            p_surgical_readiness:
              item.form.surgical_readiness,

            p_comorbidities:
              item.form.comorbidities ||
              null,

            p_consent_given:
              item.form.consent_given,
          }
        );

        if (error) {
          throw error;
        }

        successful++;
      } catch (err: any) {
        console.error(
          "Offline sync failed:",
          err
        );

        remaining.push({
          ...item,

          lastError:
            err?.message ||
            "Sync failed",
        });
      }
    }

    saveQueue(
      remaining
    );

    setSyncing(false);

    if (
      successful > 0 &&
      remaining.length === 0
    ) {
      setMessage(
        `${successful} offline booking${
          successful === 1
            ? ""
            : "s"
        } synced successfully.`
      );
    } else if (
      successful > 0
    ) {
      setMessage(
        `${successful} booking${
          successful === 1
            ? ""
            : "s"
        } synced. ${remaining.length} still require attention.`
      );
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#f6faf8]">
      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-[#dfe9e5] bg-white/95 backdrop-blur">
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
                Patient Booking
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <ConnectionBadge
              online={
                isOnline
              }
            />

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/dashboard";
              }}
              className="hidden rounded-xl border border-[#dfe9e5] bg-white px-4 py-2 text-sm font-semibold text-[#52635d] sm:block"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        {/* HERO */}

        <section className="overflow-hidden rounded-3xl bg-[#087f6b]">
          <div className="relative px-6 py-8 md:px-10 md:py-10">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />

            <div className="relative z-10">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                Rapid clinical booking
              </span>

              <h2 className="mt-4 text-3xl font-bold text-white">
                Book Patient
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
                Register cataract and pterygium patients for
                SurgiCare outreach, even when connectivity is unreliable.
              </p>
            </div>
          </div>
        </section>

        {/* OFFLINE STATUS */}

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <div
            className={`rounded-2xl border p-4 ${
              isOnline
                ? "border-[#b9ded3] bg-[#eef9f5]"
                : "border-[#f1dfae] bg-[#fff9e8]"
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-[0.12em] ${
                isOnline
                  ? "text-[#087f6b]"
                  : "text-[#8a6800]"
              }`}
            >
              Connection
            </p>

            <p className="mt-1 font-bold text-[#10233c]">
              {isOnline
                ? "Online"
                : "Offline mode"}
            </p>

            <p className="mt-1 text-xs leading-5 text-[#65756f]">
              {isOnline
                ? "Bookings can sync immediately."
                : "New bookings will queue on this device."}
            </p>
          </div>

          <div className="rounded-2xl border border-[#dfe9e5] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#65756f]">
              Sync queue
            </p>

            <div className="mt-1 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-[#10233c]">
                  {pendingBookings} pending
                </p>

                <p className="mt-1 text-xs text-[#65756f]">
                  {syncing
                    ? "Syncing now..."
                    : "Automatic sync enabled"}
                </p>
              </div>

              {isOnline &&
                pendingBookings >
                  0 && (
                  <button
                    type="button"
                    disabled={
                      syncing
                    }
                    onClick={
                      syncPendingBookings
                    }
                    className="rounded-xl bg-[#087f6b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {syncing
                      ? "Syncing..."
                      : "Sync now"}
                  </button>
                )}
            </div>
          </div>
        </section>

        {/* STEPS */}

        <section className="mt-6 rounded-2xl border border-[#dfe9e5] bg-white p-5">
          <div className="grid grid-cols-2 gap-4">
            <StepIndicator
              number="1"
              title="Patient"
              active={
                step === 1
              }
              complete={
                step === 2
              }
            />

            <StepIndicator
              number="2"
              title="Clinical"
              active={
                step === 2
              }
            />
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-4 text-sm text-[#08705f]">
            {message}
          </div>
        )}

        {/* ====================================================
            STEP 1
        ==================================================== */}

        {step === 1 && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-[#dfe9e5] bg-white">
            {/* FACILITY */}

            <FormSection
              title="Facility access"
              description="Verify the facility once to enable secure online and offline booking."
            >
              {offlineAccessReady &&
              facilityVerified ? (
                <div className="rounded-2xl border border-[#b9ded3] bg-[#eef9f5] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f6b]">
                    Authorized facility
                  </p>

                  <p className="mt-2 text-lg font-bold text-[#10233c]">
                    {facilityName}
                  </p>

                  <p className="mt-1 text-sm text-[#65756f]">
                    {facilityCode}
                  </p>

                  <p className="mt-3 text-xs leading-5 text-[#65756f]">
                    Offline booking is enabled on this device.
                  </p>

                  {isOnline && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem(
                          OFFLINE_ACCESS_KEY
                        );

                        setOfflineAccessReady(
                          false
                        );

                        setFacilityVerified(
                          false
                        );

                        setFacilityCode(
                          ""
                        );

                        setFacilityName(
                          ""
                        );

                        setFacilityPin(
                          ""
                        );
                      }}
                      className="mt-4 text-xs font-semibold text-[#087f6b] hover:underline"
                    >
                      Change facility
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-3">
                  <Field
                    label="Facility code"
                    required
                  >
                    <input
                      value={
                        facilityCode
                      }
                      onChange={(e) =>
                        setFacilityCode(
                          e.target.value
                        )
                      }
                      placeholder="SC-XXXXXXXX"
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field
                    label="4-digit PIN"
                    required
                  >
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={
                        facilityPin
                      }
                      onChange={(e) =>
                        setFacilityPin(
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                      placeholder="••••"
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={
                        checkingFacility
                      }
                      onClick={
                        verifyFacility
                      }
                      className="w-full rounded-xl bg-[#087f6b] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {checkingFacility
                        ? "Verifying..."
                        : "Verify Facility"}
                    </button>
                  </div>
                </div>
              )}
            </FormSection>

            <Divider />

            {/* CLINICIAN */}

            <FormSection
              title="Booking clinician"
              description="Record the clinician responsible for this screening."
            >
              <Field
                label="Clinician name"
                required
              >
                <input
                  value={
                    form.clinician_name
                  }
                  onChange={(e) =>
                    updateField(
                      "clinician_name",
                      e.target.value
                    )
                  }
                  placeholder="Enter clinician name"
                  className={
                    inputClass
                  }
                />
              </Field>
            </FormSection>

            <Divider />

            {/* NHIS */}

            <FormSection
              title="NHIS"
              description="Enter an NHIS number or continue without one when unavailable."
            >
              <div className="grid gap-5 md:grid-cols-[1fr_auto]">
                <Field label="NHIS membership number">
                  <input
                    value={
                      form.nhis_membership_no
                    }
                    onChange={(e) => {
                      updateField(
                        "nhis_membership_no",
                        e.target.value
                      );

                      setReturningPatient(
                        false
                      );
                    }}
                    placeholder="NHIS number"
                    className={
                      inputClass
                    }
                  />
                </Field>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={
                      checkingNhIS ||
                      !isOnline ||
                      !facilityVerified
                    }
                    onClick={
                      lookupNhIS
                    }
                    className="rounded-xl border border-[#087f6b] bg-white px-5 py-3.5 text-sm font-semibold text-[#087f6b] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {checkingNhIS
                      ? "Looking up..."
                      : "Look Up Patient"}
                  </button>
                </div>
              </div>

              {returningPatient && (
                <div className="mt-4 rounded-xl border border-[#b9ded3] bg-[#eef9f5] p-4 text-sm text-[#08705f]">
                  ✓ Returning patient identified. Existing demographic
                  information has been loaded.
                </div>
              )}

              {!isOnline && (
                <p className="mt-3 text-xs leading-5 text-[#8a6800]">
                  Returning-patient lookup is unavailable offline.
                  You can still complete the booking manually.
                </p>
              )}

              <div className="mt-5">
                <Field label="NHIS status">
                  <select
                    value={
                      form.nhis_status
                    }
                    onChange={(e) =>
                      updateField(
                        "nhis_status",
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="unchecked">
                      Unchecked
                    </option>

                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </Field>
              </div>
            </FormSection>

            <Divider />

            {/* DEMOGRAPHICS */}

            <FormSection
              title="Patient details"
              description="Basic information required for outreach planning."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Full name"
                  required
                >
                  <input
                    value={
                      form.full_name
                    }
                    onChange={(e) =>
                      updateField(
                        "full_name",
                        e.target.value
                      )
                    }
                    placeholder="Patient full name"
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field
                  label="Age"
                  required
                >
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={
                      form.age
                    }
                    onChange={(e) =>
                      updateField(
                        "age",
                        e.target.value
                      )
                    }
                    placeholder="Age"
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field
                  label="Sex"
                  required
                >
                  <select
                    value={
                      form.sex
                    }
                    onChange={(e) =>
                      updateField(
                        "sex",
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Select sex
                    </option>

                    <option value="M">
                      Male
                    </option>

                    <option value="F">
                      Female
                    </option>
                  </select>
                </Field>

                <Field label="Preferred SMS language">
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
                    className={
                      inputClass
                    }
                  >
                    <option value="English">
                      English
                    </option>

                    <option value="Twi">
                      Twi
                    </option>

                    <option value="Ga">
                      Ga
                    </option>

                    <option value="Ewe">
                      Ewe
                    </option>

                    <option value="Dagbani">
                      Dagbani
                    </option>

                    <option value="Hausa">
                      Hausa
                    </option>
                  </select>
                </Field>

                <Field label="Patient phone">
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
                    className={
                      inputClass
                    }
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
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Community">
                  <input
                    value={
                      form.community
                    }
                    onChange={(e) =>
                      updateField(
                        "community",
                        e.target.value
                      )
                    }
                    placeholder="Community"
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="District">
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
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Landmark">
                  <input
                    value={
                      form.landmark
                    }
                    onChange={(e) =>
                      updateField(
                        "landmark",
                        e.target.value
                      )
                    }
                    placeholder="Nearby landmark"
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>
            </FormSection>

            <div className="flex justify-end border-t border-[#e5eeea] bg-[#fbfdfc] p-6 md:px-8">
              <button
                type="button"
                onClick={
                  goToClinicalStep
                }
                className="rounded-xl bg-[#087f6b] px-6 py-3.5 text-sm font-semibold text-white"
              >
                Continue to Clinical Details →
              </button>
            </div>
          </section>
        )}

        {/* ====================================================
            STEP 2
        ==================================================== */}

        {step === 2 && (
          <form
            onSubmit={
              submitBooking
            }
            className="mt-6 overflow-hidden rounded-3xl border border-[#dfe9e5] bg-white"
          >
            <FormSection
              title="Clinical details"
              description="Record the screening findings for this patient."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Diagnosis"
                  required
                >
                  <select
                    value={
                      form.diagnosis
                    }
                    onChange={(e) =>
                      updateField(
                        "diagnosis",
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Select diagnosis
                    </option>

                    <option value="cataract">
                      Cataract
                    </option>

                    <option value="pterygium">
                      Pterygium
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
                </Field>

                <Field
                  label="Affected eye"
                  required
                >
                  <select
                    value={
                      form.affected_eye
                    }
                    onChange={(e) => {
                      updateField(
                        "affected_eye",
                        e.target.value
                      );

                      setDuplicateWarning(
                        false
                      );
                    }}
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Select eye
                    </option>

                    <option value="right">
                      Right
                    </option>

                    <option value="left">
                      Left
                    </option>

                    <option value="both">
                      Both
                    </option>
                  </select>
                </Field>

                <Field label="Visual acuity — Right eye">
                  <input
                    value={
                      form.visual_acuity_right
                    }
                    onChange={(e) =>
                      updateField(
                        "visual_acuity_right",
                        e.target.value
                      )
                    }
                    placeholder="e.g. 6/60"
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Visual acuity — Left eye">
                  <input
                    value={
                      form.visual_acuity_left
                    }
                    onChange={(e) =>
                      updateField(
                        "visual_acuity_left",
                        e.target.value
                      )
                    }
                    placeholder="e.g. 6/18"
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field
                  label="Surgical readiness"
                  required
                >
                  <select
                    value={
                      form.surgical_readiness
                    }
                    onChange={(e) =>
                      updateField(
                        "surgical_readiness",
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Select readiness
                    </option>

                    <option value="ready">
                      Ready Now
                    </option>

                    <option value="needs_review">
                      Needs Review
                    </option>

                    <option value="not_ready">
                      Not Ready
                    </option>
                  </select>
                </Field>
              </div>

              <div className="mt-5">
                <Field label="Comorbidities / clinical notes">
                  <textarea
                    rows={4}
                    value={
                      form.comorbidities
                    }
                    onChange={(e) =>
                      updateField(
                        "comorbidities",
                        e.target.value
                      )
                    }
                    placeholder="Diabetes, hypertension or other relevant clinical information..."
                    className={`${inputClass} resize-none`}
                  />
                </Field>
              </div>

              {duplicateWarning && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  A booking with this NHIS number and affected eye
                  already exists.
                </div>
              )}
            </FormSection>

            <Divider />

            {/* CONSENT */}

            <FormSection
              title="Patient consent"
              description="Confirm consent before adding the patient to the SurgiCare outreach pool."
            >
              <button
                type="button"
                onClick={() =>
                  updateField(
                    "consent_given",
                    !form.consent_given
                  )
                }
                className={`flex w-full items-center justify-between gap-5 rounded-2xl border p-5 text-left ${
                  form.consent_given
                    ? "border-[#87c9b7] bg-[#edf8f4]"
                    : "border-[#dfe9e5] bg-white"
                }`}
              >
                <div>
                  <p className="font-semibold text-[#10233c]">
                    Patient consent obtained
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#65756f]">
                    The patient has agreed to registration and
                    SurgiCare outreach coordination.
                  </p>
                </div>

                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    form.consent_given
                      ? "bg-[#087f6b] text-white"
                      : "bg-[#edf1ef] text-[#7a8984]"
                  }`}
                >
                  {form.consent_given
                    ? "✓"
                    : ""}
                </div>
              </button>
            </FormSection>

            {/* ACTIONS */}

            <div className="flex flex-col gap-3 border-t border-[#e5eeea] bg-[#fbfdfc] p-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
              <button
                type="button"
                onClick={() => {
                  setStep(1);

                  setError("");

                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                className="rounded-xl border border-[#dfe9e5] bg-white px-5 py-3 text-sm font-semibold text-[#52635d]"
              >
                ← Back to Patient Details
              </button>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="rounded-xl bg-[#087f6b] px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving
                  ? isOnline
                    ? "Saving patient..."
                    : "Saving offline..."
                  : isOnline
                  ? "Add to Outreach Pool"
                  : "Save Offline"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

// ============================================================
// UI HELPERS
// ============================================================

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

function Divider() {
  return (
    <div className="border-t border-[#e5eeea]" />
  );
}

function StepIndicator({
  number,
  title,
  active = false,
  complete = false,
}: {
  number: string;
  title: string;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
          complete
            ? "bg-[#e7f6f1] text-[#087f6b]"
            : active
            ? "bg-[#087f6b] text-white"
            : "bg-[#edf1ef] text-[#7a8984]"
        }`}
      >
        {complete
          ? "✓"
          : number}
      </div>

      <p
        className={`mt-2 text-xs font-semibold ${
          active || complete
            ? "text-[#087f6b]"
            : "text-[#7a8984]"
        }`}
      >
        {title}
      </p>
    </div>
  );
}

function ConnectionBadge({
  online,
}: {
  online: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        online
          ? "bg-[#e7f6f1] text-[#087f6b]"
          : "bg-[#fff7df] text-[#946900]"
      }`}
    >
      {online
        ? "● Online"
        : "● Offline"}
    </span>
  );
}