"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Appointment, Clinic, Consultation, OwnAvailability } from "../../../lib/api/contracts";
import { safeErrorMessage } from "../../../lib/api/errors";
import { useLocale } from "../../../lib/i18n/context";
import { useApp } from "../../context";
import { FoundationIcon, FoundationPortalEmblem } from "../foundation/index";
import {
  formatAppointmentStatus,
  formatAvailabilityState,
  formatDayMonthTile,
  formatFullDate,
  formatTimeDisplay,
} from "./format";
import styles from "./demo-v2.module.css";

type ScheduleFilter = "all" | "appointments" | "availability";

function normalizeDoctorPath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function DoctorDemoV2({ path }: { path: string }) {
  const { api, refresh, notify, changed } = useApp();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const cleanPath = normalizeDoctorPath(path);
  const isScheduleRoute = cleanPath === "/doctor" || cleanPath === "/doctor/schedule";
  const isAvailabilityRoute = cleanPath === "/doctor/availability";
  const isConsultationIndex = cleanPath === "/doctor/consultation";
  const consultationMatch = /^\/doctor\/consultation\/([^/]+)$/.exec(cleanPath);
  const consultationRouteId = consultationMatch ? decodeURIComponent(consultationMatch[1]) : "";
  const appointmentMatch = /^\/doctor\/appointments\/([^/]+)$/.exec(cleanPath);
  const appointmentRouteId = appointmentMatch ? decodeURIComponent(appointmentMatch[1]) : "";
  const isKnownRoute =
    isScheduleRoute ||
    isAvailabilityRoute ||
    isConsultationIndex ||
    Boolean(consultationRouteId) ||
    Boolean(appointmentRouteId);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<OwnAvailability[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ScheduleFilter>("all");

  // Publish availability state
  const [slotDate, setSlotDate] = useState("2026-10-29");
  const [slotTime, setSlotTime] = useState("15:00");
  const [slotClinicId, setSlotClinicId] = useState("cairo-clinic");
  const [slotBusy, setSlotBusy] = useState(false);
  const [slotError, setSlotError] = useState("");

  // Consultation release state — strict separation between shareable patient fields and private clinician notes
  const [selectedId, setSelectedId] = useState("");
  const [consultationDraft, setConsultationDraft] = useState<Consultation | null>(null);
  const [draftAppointmentId, setDraftAppointmentId] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [patientAssessment, setPatientAssessment] = useState("");
  const [followUpGuidance, setFollowUpGuidance] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medInstructions, setMedInstructions] = useState("");
  const [releasingIds, setReleasingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [releaseError, setReleaseError] = useState("");

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadSeqRef = useRef(0);
  const consultationSeqRef = useRef(0);
  const prevAppointmentIdRef = useRef("");
  const draftAppointmentIdRef = useRef("");
  draftAppointmentIdRef.current = draftAppointmentId;
  const activeAppointmentIdRef = useRef("");
  const releasingIdsRef = useRef<Set<string>>(new Set());
  const slotBusyRef = useRef(false);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError("");
    try {
      const [nextAppointments, slotPage, nextClinics] = await Promise.all([
        api.appointments(),
        api.ownAvailability(1),
        api.clinics(),
      ]);
      if (!isMountedRef.current || loadSeqRef.current !== seq) return;
      setAppointments(nextAppointments);
      setSlots(slotPage.data);
      setClinics(nextClinics);
      if (nextClinics.length > 0) {
        setSlotClinicId((prev) =>
          nextClinics.some((c) => c.id === prev) ? prev : nextClinics[0].id,
        );
      }
      setSelectedId((prev) => {
        if (nextAppointments.some((a) => a.id === prev)) return prev;
        return nextAppointments[0]?.id ?? "";
      });
    } catch (err) {
      if (!isMountedRef.current || loadSeqRef.current !== seq) return;
      setError(safeErrorMessage(err));
    } finally {
      if (isMountedRef.current && loadSeqRef.current === seq) {
        setLoading(false);
      }
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load, refresh]);

  const activeAppointment = useMemo(() => {
    if (consultationRouteId) {
      return appointments.find((a) => a.id === consultationRouteId) ?? null;
    }
    if (!isConsultationIndex) return null;
    return appointments.find((a) => a.id === selectedId) ?? appointments[0] ?? null;
  }, [appointments, consultationRouteId, isConsultationIndex, selectedId]);

  const activeAppointmentId = activeAppointment?.id ?? "";
  activeAppointmentIdRef.current = activeAppointmentId;

  useEffect(() => {
    let active = true;
    const appointmentChanged = prevAppointmentIdRef.current !== activeAppointmentId;
    prevAppointmentIdRef.current = activeAppointmentId;
    const reqSeq = ++consultationSeqRef.current;

    if (!activeAppointmentId || appointmentChanged) {
      setConsultationDraft(null);
      setDraftAppointmentId("");
      setPatientAssessment("");
      setFollowUpGuidance("");
      setPrivateNotes("");
      setMedName("");
      setMedDosage("");
      setMedInstructions("");
      setReleaseError("");
    }

    if (!activeAppointmentId) {
      setDraftLoading(false);
      return;
    }

    const needsLoadingState = appointmentChanged || draftAppointmentIdRef.current !== activeAppointmentId;
    if (needsLoadingState) {
      setDraftLoading(true);
    }
    api
      .consultation(activeAppointmentId)
      .then((c) => {
        if (
          !active ||
          !isMountedRef.current ||
          consultationSeqRef.current !== reqSeq ||
          activeAppointmentIdRef.current !== activeAppointmentId
        ) {
          return;
        }
        setConsultationDraft(c);
        setDraftAppointmentId(c.appointmentId);
        // Shareable patient-facing fields ONLY; private c.notes stays strictly in privateNotes.
        // Only populate form inputs on appointment switch or when authoritative released state is returned.
        if (needsLoadingState || c.released) {
          setReleaseError("");
          setPatientAssessment(c.diagnosis || "");
          setFollowUpGuidance(c.followUp || "");
          setPrivateNotes(c.notes || "");
          setMedName(c.medication || "");
          setMedDosage(c.dosage || "");
          setMedInstructions(c.instructions || "");
        }
      })
      .catch((err) => {
        if (
          !active ||
          !isMountedRef.current ||
          consultationSeqRef.current !== reqSeq ||
          activeAppointmentIdRef.current !== activeAppointmentId
        ) {
          return;
        }
        if (needsLoadingState) {
          setConsultationDraft(null);
          setDraftAppointmentId("");
        }
        setReleaseError(safeErrorMessage(err));
      })
      .finally(() => {
        if (
          active &&
          isMountedRef.current &&
          consultationSeqRef.current === reqSeq &&
          activeAppointmentIdRef.current === activeAppointmentId
        ) {
          setDraftLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [api, activeAppointmentId, refresh]);

  const clinicLabel = useCallback(
    (clinicId: string) => clinics.find((c) => c.id === clinicId)?.displayName ?? clinicId,
    [clinics],
  );

  async function publishSlot(event: React.FormEvent) {
    event.preventDefault();
    if (slotBusyRef.current) return;
    slotBusyRef.current = true;
    setSlotBusy(true);
    setSlotError("");
    try {
      // Determine actual Africa/Cairo UTC offset (+02:00 or DST +03:00) on the chosen date.
      const probeUtc = Date.parse(`${slotDate}T${slotTime}:00Z`);
      let offset = "+02:00";
      if (!Number.isNaN(probeUtc)) {
        const tzPart = new Intl.DateTimeFormat("en-US", {
          timeZone: "Africa/Cairo",
          timeZoneName: "shortOffset",
        })
          .formatToParts(new Date(probeUtc))
          .find((part) => part.type === "timeZoneName")?.value;
        const m = /GMT([+-]\d{1,2})(?::(\d{2}))?/.exec(tzPart ?? "");
        if (m) {
          const hrs = `${m[1][0]}${m[1].slice(1).padStart(2, "0")}`;
          offset = `${hrs}:${m[2] ?? "00"}`;
        }
      }
      const startIso = `${slotDate}T${slotTime}:00${offset}`;
      const startMs = Date.parse(startIso);
      const endIso = Number.isNaN(startMs)
        ? startIso
        : new Date(startMs + 30 * 60 * 1000).toISOString();
      await api.publishSlot({
        clinicId: slotClinicId,
        startAt: Number.isNaN(startMs) ? startIso : new Date(startMs).toISOString(),
        endAt: endIso,
        operationKey: `publish-${slotDate}-${slotTime}-${Date.now()}`,
      });
      if (!isMountedRef.current) return;
      const currentAr = localeRef.current === "ar";
      notify(currentAr ? "تم نشر الموعد المتاح بنجاح." : "Open slot published.");
      changed();
    } catch (err) {
      if (isMountedRef.current) {
        setSlotError(safeErrorMessage(err));
      }
    } finally {
      slotBusyRef.current = false;
      if (isMountedRef.current) {
        setSlotBusy(false);
      }
    }
  }

  async function withdrawSlot(slot: OwnAvailability) {
    if (slotBusyRef.current) return;
    slotBusyRef.current = true;
    setSlotBusy(true);
    setSlotError("");
    try {
      await api.withdrawSlot({
        slotId: slot.id,
        expectedVersion: slot.version,
        operationKey: `withdraw-${slot.id}-${slot.version}`,
      });
      if (!isMountedRef.current) return;
      const currentAr = localeRef.current === "ar";
      notify(currentAr ? "تم سحب الموعد المفتوح." : "Open slot withdrawn.");
      changed();
    } catch (err) {
      if (isMountedRef.current) {
        setSlotError(safeErrorMessage(err));
      }
    } finally {
      slotBusyRef.current = false;
      if (isMountedRef.current) {
        setSlotBusy(false);
      }
    }
  }

  async function releaseConsultation(event: React.FormEvent) {
    event.preventDefault();
    if (!activeAppointment || draftLoading) return;
    const targetId = activeAppointment.id;
    if (consultationRouteId && targetId !== consultationRouteId) return;
    if (releasingIdsRef.current.has(targetId)) return;
    if (draftAppointmentId !== targetId || consultationDraft?.appointmentId !== targetId) {
      setReleaseError(
        ar
          ? "جاري تحميل بيانات الزيارة المحددة. يرجى المحاولة بعد اكتمال التحميل."
          : "Selected consultation draft is still loading. Please retry once ready.",
      );
      return;
    }
    if (consultationDraft.released) {
      setReleaseError(
        ar
          ? "تم نشر ملخص هذه الزيارة بالفعل ولا يمكن تعديله."
          : "This demo visit is already released.",
      );
      return;
    }
    if (!patientAssessment.trim() && !followUpGuidance.trim()) {
      setReleaseError(
        ar
          ? "يرجى إدخال التقييم الموجه للمريض أو توصيات المتابعة قبل النشر."
          : "Please enter a patient-facing assessment or follow-up guidance before releasing.",
      );
      return;
    }

    const payload: Consultation = {
      ...consultationDraft,
      appointmentId: targetId,
      diagnosis: patientAssessment.trim(),
      followUp: followUpGuidance.trim(),
      // Private clinician notes stay strictly clinician-only; adapter.record() strips notes on Patient reads.
      notes: privateNotes.trim(),
      medication: medName.trim(),
      dosage: medDosage.trim(),
      instructions: medInstructions.trim(),
      released: true,
    };

    releasingIdsRef.current.add(targetId);
    setReleasingIds((prev) => {
      const next = new Set(prev);
      next.add(targetId);
      return next;
    });
    setReleaseError("");
    try {
      await api.release(payload);
      if (!isMountedRef.current) return;
      if (activeAppointmentIdRef.current === targetId) {
        setConsultationDraft((prev) =>
          prev && prev.appointmentId === targetId ? payload : prev,
        );
        const currentAr = localeRef.current === "ar";
        notify(
          currentAr
            ? "تم اعتماد ونشر التقييم الموجه للمريض وتعليمات الوصفة."
            : "Patient-facing assessment and prescription instructions released.",
        );
      }
      changed();
    } catch (err) {
      if (isMountedRef.current && activeAppointmentIdRef.current === targetId) {
        setReleaseError(safeErrorMessage(err));
      }
    } finally {
      releasingIdsRef.current.delete(targetId);
      if (isMountedRef.current) {
        setReleasingIds((prev) => {
          if (!prev.has(targetId)) return prev;
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      }
    }
  }

  if (loading) {
    return (
      <section className={styles.workspace} data-v2-portal="doctor">
        <div className={styles.card}>
          <p className={styles.muted}>{ar ? "جاري تحميل بوابة الطبيب..." : "Loading clinician workspace..."}</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.workspace} data-v2-portal="doctor">
        <section className={styles.card}>
          <h1>{ar ? "بوابة الطبيب" : "Doctor Workspace"}</h1>
          <div className={styles.noticeDanger} role="alert">
            <p>{error}</p>
            <button type="button" className={styles.btnSecondary} onClick={() => void load()}>
              {ar ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </section>
      </section>
    );
  }

  if (!isKnownRoute) {
    return (
      <section className={styles.workspace} data-v2-portal="doctor" aria-labelledby="doc-not-found-title">
        <section className={styles.card} data-v2-not-found="true">
          <h1 id="doc-not-found-title">{ar ? "الصفحة غير موجودة" : "Doctor page not found"}</h1>
          <p className={styles.muted}>
            {ar
              ? "المسار المطلوب غير متاح داخل بوابة الطبيب."
              : "The requested route is not available in the clinician workspace."}
          </p>
          <div className={styles.actionRow}>
            <Link href="/doctor/schedule" className={styles.btnPrimary}>
              {ar ? "العودة إلى الجدول" : "Return to schedule"}
            </Link>
          </div>
        </section>
      </section>
    );
  }

  // Subroute: /doctor/appointments/:id
  if (appointmentRouteId) {
    const exactAppointment = appointments.find((a) => a.id === appointmentRouteId) ?? null;
    if (!exactAppointment) {
      return (
        <section className={styles.workspace} data-v2-portal="doctor" aria-labelledby="doc-appt-missing-title">
          <section className={styles.card} data-v2-not-found="true">
            <h1 id="doc-appt-missing-title">{ar ? "الموعد غير موجود" : "Assigned appointment not found"}</h1>
            <p className={styles.muted}>
              {ar
                ? "لا يوجد موعد مسند مطابق لهذا المعرّف في جدولك الحالي."
                : "No assigned appointment matches this identifier in your current schedule."}
            </p>
            <div className={styles.actionRow}>
              <Link href="/doctor/schedule" className={styles.btnPrimary}>
                {ar ? "العودة إلى الجدول" : "Return to schedule"}
              </Link>
            </div>
          </section>
        </section>
      );
    }

    return (
      <section className={styles.workspace} data-v2-portal="doctor" aria-labelledby="doc-appt-detail-title">
        <header className={styles.banner}>
          <div className={styles.bannerHead}>
            <FoundationPortalEmblem role="doctor" className={styles.emblem} />
            <div className={styles.bannerTitles}>
              <h1 id="doc-appt-detail-title">{ar ? "تفاصيل الموعد المسند" : "Assigned appointment details"}</h1>
              <p>{ar ? "لقطة الحجز وبيانات الزيارة بتوقيت 24 ساعة." : "Booking-time snapshot and visit schedule in 24-hour time."}</p>
            </div>
          </div>
          <span className={styles.pillSuccess}>{formatAppointmentStatus(exactAppointment.status, locale)}</span>
        </header>

        <section className={styles.card}>
          <h2>{ar ? "ملخص الموعد" : "Appointment summary"}</h2>
          <div className={styles.cardInset}>
            <p className={styles.muted} data-booking-patient-snapshot="true">
              {ar ? "اسم المريض المسجل وقت الحجز:" : "Booked patient name (snapshot at booking):"}{" "}
              <strong>{exactAppointment.patientName}</strong>
            </p>
            <p className={styles.muted}>
              {clinicLabel(exactAppointment.slot.clinicId)} ·{" "}
              <span className={styles.tabular}>
                {formatFullDate(exactAppointment.slot.startAt, locale)} ·{" "}
                {formatTimeDisplay(exactAppointment.slot.startAt, locale, "professional")}
              </span>
            </p>
            <p className={styles.subtle}>
              {ar ? "سبب الحجز:" : "Booked reason:"} {exactAppointment.reason}
            </p>
          </div>
          <div className={styles.actionRow}>
            <Link href={`/doctor/consultation/${encodeURIComponent(exactAppointment.id)}`} className={styles.btnPrimary}>
              {ar ? "فتح الاستشارة" : "Open consultation"}
            </Link>
            <Link href="/doctor/schedule" className={styles.btnSecondary}>
              {ar ? "العودة إلى الجدول" : "Back to schedule"}
            </Link>
          </div>
        </section>
      </section>
    );
  }

  // Subroute: /doctor/availability
  if (isAvailabilityRoute) {
    return (
      <section className={styles.workspace} data-v2-portal="doctor" aria-labelledby="doc-avail-title">
        <header className={styles.banner}>
          <div className={styles.bannerHead}>
            <FoundationPortalEmblem role="doctor" className={styles.emblem} />
            <div className={styles.bannerTitles}>
              <h1 id="doc-avail-title">{ar ? "إدارة المواعيد المتاحة" : "Manage Availability"}</h1>
              <p>{ar ? "نشر أو سحب الفترات الزمنية بتوقيت 24 ساعة." : "Publish open slots and withdraw unbooked windows in 24-hour time."}</p>
            </div>
          </div>
          <span className={styles.pill}>{ar ? "توقيت 24 ساعة" : "24h clinician time"}</span>
        </header>

        <div className={styles.grid2}>
          <section className={styles.card}>
            <h2>{ar ? "إضافة فترة متاحة جديدة" : "Publish open slot"}</h2>
            <form className={styles.workspace} onSubmit={(e) => void publishSlot(e)} data-publish-slot-form="true">
              <div className={styles.field}>
                <label htmlFor="slot-date">{ar ? "التاريخ" : "Date"}</label>
                <input
                  id="slot-date"
                  type="date"
                  className={styles.input}
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="slot-time">{ar ? "الوقت (24 ساعة)" : "Time (24h HH:mm)"}</label>
                <input
                  id="slot-time"
                  type="time"
                  className={styles.input}
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="slot-clinic">{ar ? "العيادة" : "Clinic"}</label>
                <select
                  id="slot-clinic"
                  className={styles.select}
                  value={slotClinicId}
                  onChange={(e) => setSlotClinicId(e.target.value)}
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} ({c.city})
                    </option>
                  ))}
                </select>
              </div>
              {slotError ? (
                <p className={styles.noticeDanger} role="alert">
                  {slotError}
                </p>
              ) : null}
              <button type="submit" className={styles.btnPrimary} disabled={slotBusy} data-publish-slot-btn="true">
                <FoundationIcon name="plus" size={16} />
                <span>{slotBusy ? (ar ? "جاري النشر..." : "Publishing...") : ar ? "نشر الموعد" : "Publish slot"}</span>
              </button>
            </form>
          </section>

          <section className={styles.card}>
            <h2>{ar ? "المواعيد المنشورة حاليًا" : "Current clinician slots"}</h2>
            {slots.length === 0 ? (
              <p className={styles.muted}>{ar ? "لا توجد مواعيد منشورة." : "No open availability slots published."}</p>
            ) : (
              <ul className={styles.listStack}>
                {slots.map((s) => (
                  <li key={s.id} className={styles.cardInset} data-own-slot={s.id}>
                    <div className={styles.cardTitleRow}>
                      <span className={styles.tabular}>
                        {formatFullDate(s.startAt, locale)} · {formatTimeDisplay(s.startAt, locale, "professional")}
                      </span>
                      <span className={s.state === "WITHDRAWN" ? styles.pillWarning : styles.pillSuccess}>
                        {formatAvailabilityState(s.state, locale)}
                      </span>
                    </div>
                    <p className={styles.subtle}>{clinicLabel(s.clinicId)}</p>
                    {s.state === "PUBLISHED" ? (
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        disabled={slotBusy}
                        onClick={() => void withdrawSlot(s)}
                        data-withdraw-slot={s.id}
                      >
                        {ar ? "سحب الموعد" : "Withdraw slot"}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    );
  }

  // Subroute: /doctor/consultation or /doctor/consultation/:id
  if (isConsultationIndex || consultationRouteId) {
    if (consultationRouteId && !activeAppointment) {
      return (
        <section className={styles.workspace} data-v2-portal="doctor" aria-labelledby="doc-consult-missing-title">
          <section className={styles.card} data-v2-not-found="true">
            <h1 id="doc-consult-missing-title">
              {ar ? "الاستشارة غير موجودة" : "Consultation not found"}
            </h1>
            <p className={styles.muted}>
              {ar
                ? "لا توجد زيارة مسندة مطابقة لهذا المعرّف. لا يمكن فتح زيارات أطباء آخرين أو معرفات غير صحيحة."
                : "No assigned visit matches this identifier. Unknown IDs and visits assigned to other clinicians cannot be opened here."}
            </p>
            <div className={styles.actionRow}>
              <Link href="/doctor/schedule" className={styles.btnPrimary}>
                {ar ? "العودة إلى الجدول" : "Return to schedule"}
              </Link>
              <Link href="/doctor/consultation" className={styles.btnSecondary}>
                {ar ? "الاستشارات المسندة" : "Assigned consultations"}
              </Link>
            </div>
          </section>
        </section>
      );
    }

    const isReleased = Boolean(consultationDraft?.released);
    const isReleaseBusy = Boolean(activeAppointment && releasingIds.has(activeAppointment.id));

    return (
      <section className={styles.workspace} data-v2-portal="doctor" aria-labelledby="doc-consult-title">
        <header className={styles.banner}>
          <div className={styles.bannerHead}>
            <FoundationPortalEmblem role="doctor" className={styles.emblem} />
            <div className={styles.bannerTitles}>
              <h1 id="doc-consult-title">{ar ? "الاستشارة وإصدار التوصيات" : "Consultation & Release"}</h1>
              <p>
                {ar
                  ? "توثيق التقييم الموجه للمريض، وتوصيات المتابعة، والملاحظات الخاصة المنفصلة."
                  : "Document patient-facing assessment and follow-up guidance separately from private clinician notes."}
              </p>
            </div>
          </div>
          <span className={styles.pill}>{ar ? "نطاق إسناد الطبيب فقط" : "Assigned visits only"}</span>
        </header>

        <div className={styles.noticeInfo}>
          {ar
            ? "قسم (مرضاي) الشامل مخطط لمراحل قادمة؛ تظهر هنا المواعيد المسندة حاليًا فقط. تبقى الملاحظات الخاصة للطبيب مخفية عن المريض والصيدلية."
            : "The full My patients directory is planned for a later clinical phase; only active assigned visits appear here. Private clinician notes are never shared with Patient or Pharmacy."}
        </div>

        <section className={styles.card}>
          <h2>{ar ? "الزيارة المختارة والتوثيق" : "Selected visit & release"}</h2>

          {!consultationRouteId && appointments.length > 0 ? (
            <div className={styles.field}>
              <label htmlFor="consult-select">{ar ? "اختر الزيارة" : "Select assigned appointment"}</label>
              <select
                id="consult-select"
                className={styles.select}
                value={activeAppointment?.id ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.patientName} · {formatFullDate(a.slot.startAt, locale)} ·{" "}
                    {formatTimeDisplay(a.slot.startAt, locale, "professional")}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {!activeAppointment ? (
            <div className={styles.cardInset} data-doctor-empty-consultations="true">
              <h3>{ar ? "لا توجد مواعيد محجوزة بعد" : "No booked consultations yet"}</h3>
              <p className={styles.muted}>
                {ar
                  ? "تبدأ الجلسة التجريبية الجديدة بدون مواعيد محجوزة. لعرض استشارة هنا، بدّل الدور إلى المريض من القائمة العلوية، ثم افتح «استكشف الأطباء» واحجز موعدًا مع د. مريم حسن، ثم عد إلى بوابة الطبيب."
                  : "A fresh browser demo starts with zero booked consultations. To open an assigned consultation here, use Switch demo role -> Patient -> Discover, book an open slot with Dr. Mariam Hassan, then switch back to Doctor."}
              </p>
              <div className={styles.actionRow}>
                <Link href="/doctor/schedule" className={styles.btnSecondary}>
                  {ar ? "العودة إلى الجدول" : "View doctor schedule"}
                </Link>
                <Link href="/doctor/availability" className={styles.btnSecondary}>
                  {ar ? "إدارة المواعيد المتاحة" : "Manage availability"}
                </Link>
              </div>
            </div>
          ) : draftLoading ? (
            <p className={styles.muted}>{ar ? "جاري تحميل مسودة الاستشارة..." : "Loading consultation draft..."}</p>
          ) : (
            <form className={styles.workspace} onSubmit={(e) => void releaseConsultation(e)} data-release-form="true">
              <div className={styles.cardInset}>
                <p className={styles.muted} data-booking-patient-snapshot="true">
                  {ar ? "اسم المريض المسجل وقت الحجز:" : "Booked patient name (snapshot at booking):"}{" "}
                  <strong>{activeAppointment.patientName}</strong> ·{" "}
                  {formatFullDate(activeAppointment.slot.startAt, locale)} ·{" "}
                  {formatTimeDisplay(activeAppointment.slot.startAt, locale, "professional")}
                </p>
                <p className={styles.subtle}>
                  {ar ? "سبب الحجز:" : "Booked reason:"} {activeAppointment.reason} ·{" "}
                  <span className={styles.pillSuccess}>{formatAppointmentStatus(activeAppointment.status, locale)}</span>
                </p>
              </div>

              {isReleased ? (
                <div className={styles.noticeInfo} role="status" data-consultation-released="true">
                  {ar
                    ? "تم نشر التقييم الموجه للمريض وتوصيات المتابعة (للقراءة فقط). تبقى الملاحظات الخاصة للطبيب مخفية عن المريض."
                    : "Patient-facing assessment & follow-up guidance released (read-only). Private clinician notes remain excluded from the patient record."}
                </div>
              ) : null}

              <fieldset disabled={isReleased || isReleaseBusy} className={styles.fieldset}>
                <div className={styles.field}>
                  <label htmlFor="consult-assessment">
                    {ar ? "التقييم الموثق للمريض (يُشارك عند النشر)" : "Patient-facing assessment (shared on release)"}
                  </label>
                  <textarea
                    id="consult-assessment"
                    className={styles.textarea}
                    value={patientAssessment}
                    onChange={(e) => setPatientAssessment(e.target.value)}
                    placeholder={
                      ar
                        ? "اكتب التقييم السريري الموجه للمريض..."
                        : "Enter patient-facing clinical assessment..."
                    }
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="consult-followup">
                    {ar ? "توصيات المتابعة والرعاية (تُشارك عند النشر)" : "Follow-up & care guidance (shared on release)"}
                  </label>
                  <textarea
                    id="consult-followup"
                    className={styles.textarea}
                    value={followUpGuidance}
                    onChange={(e) => setFollowUpGuidance(e.target.value)}
                    placeholder={
                      ar
                        ? "اكتب خطة المتابعة وتوجيهات الزيارة..."
                        : "Enter patient-facing care and follow-up guidance..."
                    }
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="consult-private-notes">
                    {ar
                      ? "ملاحظة خاصة للطبيب (للطبيب فقط — لا تُشارك أبدًا مع المريض)"
                      : "Private clinician note (clinician-only; never shared with patient)"}
                  </label>
                  <textarea
                    id="consult-private-notes"
                    className={styles.textarea}
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    placeholder={
                      ar
                        ? "ملاحظة خاصة بالطبيب تبقى سرية..."
                        : "Clinician-only note; excluded from patient record and pharmacy..."
                    }
                  />
                </div>

                <div className={styles.grid3}>
                  <div className={styles.field}>
                    <label htmlFor="consult-med">{ar ? "اسم الدواء (اختياري)" : "Medication (optional)"}</label>
                    <input
                      id="consult-med"
                      type="text"
                      className={styles.input}
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      placeholder="e.g. Amoxicillin 500mg"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="consult-dosage">{ar ? "الجرعة (اختياري)" : "Dosage (optional)"}</label>
                    <input
                      id="consult-dosage"
                      type="text"
                      className={styles.input}
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      placeholder="e.g. 500 mg"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="consult-inst">
                      {ar ? "تعليمات الدواء والصرف (اختياري)" : "Medication & dispensing instructions (optional)"}
                    </label>
                    <input
                      id="consult-inst"
                      type="text"
                      className={styles.input}
                      value={medInstructions}
                      onChange={(e) => setMedInstructions(e.target.value)}
                      placeholder="e.g. Twice daily after meals"
                    />
                  </div>
                </div>
              </fieldset>

              {releaseError ? (
                <p className={styles.noticeDanger} role="alert">
                  {releaseError}
                </p>
              ) : null}

              {!isReleased ? (
                <div className={styles.actionRow}>
                  <button type="submit" className={styles.btnPrimary} disabled={isReleaseBusy} data-release-submit="true">
                    {isReleaseBusy
                      ? ar
                        ? "جاري النشر..."
                        : "Releasing..."
                      : ar
                        ? "نشر التقييم والوصفة للمريض"
                        : "Release patient assessment & prescription"}
                  </button>
                </div>
              ) : null}
            </form>
          )}
        </section>
      </section>
    );
  }

  // Default: /doctor/schedule
  const showAppointments = filter === "all" || filter === "appointments";
  const showAvailability = filter === "all" || filter === "availability";
  const publishedSlots = slots.filter((s) => s.state === "PUBLISHED");

  return (
    <section className={styles.workspace} data-v2-portal="doctor" aria-labelledby="doc-sched-title">
      <header className={styles.banner}>
        <div className={styles.bannerHead}>
          <FoundationPortalEmblem role="doctor" className={styles.emblem} />
          <div className={styles.bannerTitles}>
            <h1 id="doc-sched-title">{ar ? "جدول الطبيب اليومي" : "Doctor Schedule"}</h1>
            <p>
              {ar
                ? "متابعة الزيارات المحجوزة والمواعيد المفتوحة بتوقيت 24 ساعة."
                : "Review booked consultations and open availability slots in 24-hour time."}
            </p>
          </div>
        </div>
        <div className={styles.actionRow}>
          <Link href="/doctor/availability" className={styles.btnSecondary}>
            {ar ? "إدارة المواعيد" : "Manage availability"}
          </Link>
          <Link href="/doctor/consultation" className={styles.btnPrimary}>
            {ar ? "فتح الاستشارة" : "Open consultation"}
          </Link>
        </div>
      </header>

      <section className={styles.card}>
        <h2 className="sr-only">{ar ? "الزيارات والمواعيد المتاحة" : "Schedule appointments and open slots"}</h2>
        <div className={styles.actionRow} role="group" aria-label={ar ? "تصفية الجدول" : "Schedule filter"}>
          <button
            type="button"
            className={styles.btnSecondary}
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            {ar ? "الكل" : "All"}
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            aria-pressed={filter === "appointments"}
            onClick={() => setFilter("appointments")}
          >
            {ar ? "الزيارات المحجوزة" : "Appointments"}
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            aria-pressed={filter === "availability"}
            onClick={() => setFilter("availability")}
          >
            {ar ? "المواعيد المتاحة" : "Open slots"}
          </button>
        </div>

        {showAppointments && appointments.length === 0 ? (
          <div className={styles.cardInset} data-doctor-empty-schedule="true">
            <h3>{ar ? "لا توجد زيارات محجوزة حاليًا" : "No booked visits yet"}</h3>
            <p className={styles.muted}>
              {ar
                ? "تظهر هنا المواعيد بعد الحجز من بوابة المريض التجريبية (د. مريم حسن). يمكنك التبديل إلى المريض وحجز موعد ثم العودة."
                : "Booked visits appear here after creating a synthetic booking in the Patient workspace (Dr. Mariam Hassan)."}
            </p>
          </div>
        ) : null}

        <ul className={styles.listStack}>
          {showAppointments &&
            appointments.map((a) => {
              const tile = formatDayMonthTile(a.slot.startAt, locale);
              return (
                <li key={a.id} className={styles.scheduleItem} data-doctor-appointment={a.id}>
                  <div className={styles.tileBadge}>
                    <strong className={styles.tabular}>{tile.day}</strong>
                    <span>{tile.month}</span>
                  </div>
                  <div className={styles.workspace}>
                    <h3>
                      <Link href={`/doctor/consultation/${encodeURIComponent(a.id)}`} className={styles.inlineLink}>
                        {a.patientName}
                      </Link>
                    </h3>
                    <p className={styles.subtle} data-booking-patient-snapshot="true">
                      {ar ? "اسم المريض مسجل وقت الحجز" : "Patient name recorded at booking"}
                    </p>
                    <p className={styles.muted}>
                      {clinicLabel(a.slot.clinicId)} ·{" "}
                      <span className={styles.tabular}>
                        {formatFullDate(a.slot.startAt, locale)} · {formatTimeDisplay(a.slot.startAt, locale, "professional")}
                      </span>
                    </p>
                    <p className={styles.subtle}>{a.reason}</p>
                  </div>
                  <span className={styles.pillSuccess}>{formatAppointmentStatus(a.status, locale)}</span>
                </li>
              );
            })}

          {showAvailability &&
            publishedSlots.map((s) => {
              const tile = formatDayMonthTile(s.startAt, locale);
              return (
                <li key={s.id} className={styles.scheduleItem} data-doctor-open-slot={s.id}>
                  <div className={styles.tileBadge}>
                    <strong className={styles.tabular}>{tile.day}</strong>
                    <span>{tile.month}</span>
                  </div>
                  <div className={styles.workspace}>
                    <h3>{ar ? "فترة متاحة للحجز" : "Open slot"}</h3>
                    <p className={styles.muted}>
                      {clinicLabel(s.clinicId)} ·{" "}
                      <span className={styles.tabular}>
                        {formatFullDate(s.startAt, locale)} · {formatTimeDisplay(s.startAt, locale, "professional")}
                      </span>
                    </p>
                  </div>
                  <span className={styles.pill}>{ar ? "مفتوح" : "Open"}</span>
                </li>
              );
            })}
        </ul>
      </section>
    </section>
  );
}
