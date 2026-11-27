"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Appointment, Clinic, Consultation, OwnAvailability } from "../../../lib/api/contracts";
import { safeErrorMessage } from "../../../lib/api/errors";
import { useLocale } from "../../../lib/i18n/context";
import { useApp } from "../../context";
import { FoundationIcon, FoundationPortalEmblem } from "../foundation/index";
import { formatDayMonthTile, formatFullDate, formatTimeDisplay } from "./format";
import styles from "./demo-v2.module.css";

type ScheduleFilter = "all" | "appointments" | "availability";

export function DoctorDemoV2({ path }: { path: string }) {
  const { api, refresh, notify, changed } = useApp();
  const { locale } = useLocale();
  const ar = locale === "ar";

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

  // Consultation release state
  const [selectedId, setSelectedId] = useState("");
  const [consultationDraft, setConsultationDraft] = useState<Consultation | null>(null);
  const [noteSummary, setNoteSummary] = useState("");
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medInstructions, setMedInstructions] = useState("");
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [releaseError, setReleaseError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextAppointments, slotPage, nextClinics] = await Promise.all([
        api.appointments(),
        api.ownAvailability(1),
        api.clinics(),
      ]);
      setAppointments(nextAppointments);
      setSlots(slotPage.data);
      setClinics(nextClinics);
      if (nextClinics.length > 0) {
        setSlotClinicId((prev) =>
          nextClinics.some((c) => c.id === prev) ? prev : nextClinics[0].id,
        );
      }
      if (nextAppointments.length > 0) {
        setSelectedId((prev) =>
          nextAppointments.some((a) => a.id === prev) ? prev : nextAppointments[0].id,
        );
      }
    } catch (err) {
      setError(safeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load, refresh]);

  const activeAppointment = useMemo(
    () => appointments.find((a) => a.id === selectedId) ?? appointments[0] ?? null,
    [appointments, selectedId],
  );

  useEffect(() => {
    let active = true;
    if (!activeAppointment) {
      setConsultationDraft(null);
      return;
    }
    api
      .consultation(activeAppointment.id)
      .then((c) => {
        if (!active) return;
        setConsultationDraft(c);
        setNoteSummary(c.notes || "");
        setMedName(c.medication || "");
        setMedDosage(c.dosage || "");
        setMedInstructions(c.instructions || "");
      })
      .catch(() => {
        if (active) setConsultationDraft(null);
      });
    return () => {
      active = false;
    };
  }, [api, activeAppointment]);

  const clinicLabel = useCallback(
    (clinicId: string) => clinics.find((c) => c.id === clinicId)?.displayName ?? clinicId,
    [clinics],
  );

  async function publishSlot(event: React.FormEvent) {
    event.preventDefault();
    if (slotBusy) return;
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
      notify(ar ? "تم نشر الموعد المتاح بنجاح." : "Open slot published.");
      changed();
    } catch (err) {
      setSlotError(safeErrorMessage(err));
    } finally {
      setSlotBusy(false);
    }
  }

  async function withdrawSlot(slot: OwnAvailability) {
    setSlotBusy(true);
    setSlotError("");
    try {
      await api.withdrawSlot({
        slotId: slot.id,
        expectedVersion: slot.version,
        operationKey: `withdraw-${slot.id}-${slot.version}`,
      });
      notify(ar ? "تم سحب الموعد المفتوح." : "Open slot withdrawn.");
      changed();
    } catch (err) {
      setSlotError(safeErrorMessage(err));
    } finally {
      setSlotBusy(false);
    }
  }

  async function releaseConsultation(event: React.FormEvent) {
    event.preventDefault();
    if (!activeAppointment || releaseBusy) return;
    if (!noteSummary.trim()) {
      setReleaseError(ar ? "يرجى إدخال ملخص الاستشارة قبل النشر." : "Please enter a consultation summary before releasing.");
      return;
    }
    setReleaseBusy(true);
    setReleaseError("");
    try {
      const base: Consultation = consultationDraft ?? {
        appointmentId: activeAppointment.id,
        complaint: activeAppointment.reason,
        diagnosis: "",
        allergies: "",
        notes: "",
        medication: "",
        dosage: "",
        lab: "",
        instructions: "",
        followUp: "",
        released: false,
      };
      await api.release({
        ...base,
        notes: noteSummary.trim(),
        medication: medName.trim(),
        dosage: medDosage.trim(),
        instructions: medInstructions.trim(),
        released: true,
      });
      notify(ar ? "تم اعتماد ونشر ملخص الزيارة." : "Consultation note and prescription released.");
      changed();
    } catch (err) {
      setReleaseError(safeErrorMessage(err));
    } finally {
      setReleaseBusy(false);
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
        <div className={styles.noticeDanger} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.btnSecondary} onClick={() => void load()}>
            {ar ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </section>
    );
  }

  // Subroute: /doctor/availability
  if (path === "/doctor/availability" || path.startsWith("/doctor/availability/")) {
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
                        {s.state}
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

  // Subroute: /doctor/consultation
  if (path === "/doctor/consultation" || path.startsWith("/doctor/consultation/")) {
    return (
      <section className={styles.workspace} data-v2-portal="doctor" aria-labelledby="doc-consult-title">
        <header className={styles.banner}>
          <div className={styles.bannerHead}>
            <FoundationPortalEmblem role="doctor" className={styles.emblem} />
            <div className={styles.bannerTitles}>
              <h1 id="doc-consult-title">{ar ? "الاستشارة وإصدار التوصيات" : "Consultation & Release"}</h1>
              <p>
                {ar
                  ? "توثيق ملخص الزيارة وإصدار تعليمات الدواء للمريض والصيدلية."
                  : "Record visit summary and release medication instructions to Patient & Pharmacy."}
              </p>
            </div>
          </div>
          <span className={styles.pill}>{ar ? "نطاق إسناد الطبيب فقط" : "Assigned visits only"}</span>
        </header>

        <div className={styles.noticeInfo}>
          {ar
            ? "قسم (مرضاي) الشامل مخطط لمراحل قادمة؛ تظهر هنا المواعيد المسندة حاليًا فقط."
            : "The full My patients directory is planned for a later clinical phase; only active assigned visits appear here."}
        </div>

        <section className={styles.card}>
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

          {!activeAppointment ? (
            <p className={styles.muted}>{ar ? "لا توجد مواعيد محجوزة للمراجعة." : "No booked consultations available."}</p>
          ) : (
            <form className={styles.workspace} onSubmit={(e) => void releaseConsultation(e)} data-release-form="true">
              <div className={styles.cardInset}>
                <p className={styles.muted}>
                  <strong>{activeAppointment.patientName}</strong> ·{" "}
                  {formatFullDate(activeAppointment.slot.startAt, locale)} ·{" "}
                  {formatTimeDisplay(activeAppointment.slot.startAt, locale, "professional")}
                </p>
                <p className={styles.subtle}>
                  {ar ? "سبب الحجز:" : "Booked reason:"} {activeAppointment.reason}
                </p>
              </div>

              <div className={styles.field}>
                <label htmlFor="consult-summary">{ar ? "ملخص الاستشارة للمريض" : "Released patient summary"}</label>
                <textarea
                  id="consult-summary"
                  className={styles.textarea}
                  value={noteSummary}
                  onChange={(e) => setNoteSummary(e.target.value)}
                  placeholder={ar ? "اكتب التوصيات وملخص الزيارة..." : "Document concise visit summary and care guidance..."}
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
                  <label htmlFor="consult-inst">{ar ? "تعليمات الصرف والاستخدام" : "Dispensing instructions"}</label>
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

              {releaseError ? (
                <p className={styles.noticeDanger} role="alert">
                  {releaseError}
                </p>
              ) : null}

              <div className={styles.actionRow}>
                <button type="submit" className={styles.btnPrimary} disabled={releaseBusy} data-release-submit="true">
                  {releaseBusy ? (ar ? "جاري النشر..." : "Releasing...") : ar ? "نشر الملخص والوصفة" : "Release note & prescription"}
                </button>
              </div>
            </form>
          )}
        </section>
      </section>
    );
  }

  // Default: /doctor/schedule
  const showAppointments = filter === "all" || filter === "appointments";
  const showAvailability = filter === "all" || filter === "availability";

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
                    <h3>{a.patientName}</h3>
                    <p className={styles.muted}>
                      {clinicLabel(a.slot.clinicId)} ·{" "}
                      <span className={styles.tabular}>
                        {formatFullDate(a.slot.startAt, locale)} · {formatTimeDisplay(a.slot.startAt, locale, "professional")}
                      </span>
                    </p>
                    <p className={styles.subtle}>{a.reason}</p>
                  </div>
                  <span className={styles.pillSuccess}>{a.status}</span>
                </li>
              );
            })}

          {showAvailability &&
            slots
              .filter((s) => s.state === "PUBLISHED")
              .map((s) => {
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
