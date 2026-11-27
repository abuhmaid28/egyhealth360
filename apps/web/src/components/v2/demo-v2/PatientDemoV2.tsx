"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  Appointment,
  Availability,
  Profile,
  Provider,
  RecordOverview,
} from "../../../lib/api/contracts";
import { safeErrorMessage } from "../../../lib/api/errors";
import { useLocale } from "../../../lib/i18n/context";
import { useApp } from "../../context";
import {
  FoundationIcon,
  FoundationPortalEmblem,
  FoundationPortrait,
} from "../foundation/index";
import { formatDayMonthTile, formatFullDate, formatTimeDisplay, toLatinDigits } from "./format";
import styles from "./demo-v2.module.css";

export function PatientDemoV2({ path }: { path: string }) {
  const { api, booking, session, refresh, notify, changed } = useApp();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const isDemoSurface = api.mode === "demo" && session.mode === "demo";

  const [providers, setProviders] = useState<Provider[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [record, setRecord] = useState<RecordOverview | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Discover & booking state
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("ALL");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [slots, setSlots] = useState<Availability[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [visitReason, setVisitReason] = useState("");
  // Nonoperative UI prototype checkbox — MUST start false and NEVER mutate backend/authority.
  const [consentPrototypeChecked, setConsentPrototypeChecked] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [receipt, setReceipt] = useState<Appointment | null>(null);

  // Settings form state matching contracts.Profile
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editSex, setEditSex] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextProviders, nextAppointments, nextRecord, nextProfile] = await Promise.all([
        api.providers(),
        api.appointments(),
        api.record(),
        api.profile(),
      ]);
      setProviders(nextProviders);
      setAppointments(nextAppointments);
      setRecord(nextRecord);
      setProfile(nextProfile);
      setEditName(nextProfile.displayName);
      setEditDob(nextProfile.dateOfBirth ?? "");
      setEditSex(nextProfile.sex ?? "");
    } catch (err) {
      setError(safeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadCore();
  }, [loadCore, refresh]);

  const loadSlots = useCallback(
    async (providerId: string) => {
      setSelectedProviderId(providerId);
      setSelectedSlot(null);
      setBookingError("");
      setSlotsLoading(true);
      try {
        const page = await api.availabilityPage(providerId, { page: 1, pageSize: 16 });
        setSlots(page.data.filter((slot) => slot.bookable));
      } catch (err) {
        setBookingError(safeErrorMessage(err));
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (path === "/patient/discover" && providers.length > 0 && !selectedProviderId) {
      void loadSlots(providers[0].id);
    }
  }, [path, providers, selectedProviderId, loadSlots]);

  const specialties = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of providers) {
      if (p.specialty?.key) map.set(p.specialty.key, p.specialty.displayName);
    }
    return [
      { key: "ALL", displayName: ar ? "الكل" : "All" },
      ...Array.from(map.entries()).map(([key, displayName]) => ({ key, displayName })),
    ];
  }, [providers, ar]);

  const filteredProviders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return providers.filter((p) => {
      if (specialtyFilter !== "ALL" && p.specialty?.key !== specialtyFilter) return false;
      if (!q) return true;
      const clinicFields = p.clinics.flatMap((c) => [c.displayName, c.city, c.address]);
      return [p.displayName, p.specialty?.displayName, ...clinicFields]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [providers, searchQuery, specialtyFilter]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === selectedProviderId) ?? filteredProviders[0] ?? null,
    [providers, selectedProviderId, filteredProviders],
  );

  const clinicNameFor = useCallback(
    (provider: Provider | null, clinicId: string): string => {
      if (!provider) return clinicId;
      return provider.clinics.find((c) => c.id === clinicId)?.displayName ?? provider.clinics[0]?.displayName ?? clinicId;
    },
    [],
  );

  async function submitBooking(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedSlot || bookingBusy) return;
    const trimmed = visitReason.trim();
    if (!trimmed) {
      setBookingError(ar ? "يرجى كتابة سبب مختصر للزيارة." : "Please enter a brief visit reason.");
      return;
    }
    setBookingBusy(true);
    setBookingError("");
    try {
      const created = await booking.create(selectedSlot.id, trimmed);
      setReceipt(created);
      setSelectedSlot(null);
      setVisitReason("");
      setConsentPrototypeChecked(false);
      notify(ar ? "تم تأكيد الحجز التجريبي بنجاح." : "Synthetic appointment booked.");
      changed();
      if (selectedProviderId) {
        void loadSlots(selectedProviderId);
      }
    } catch (err) {
      setBookingError(safeErrorMessage(err));
    } finally {
      setBookingBusy(false);
    }
  }

  async function submitProfile(event: React.FormEvent) {
    event.preventDefault();
    if (profileBusy) return;
    const nameTrimmed = editName.trim();
    if (!nameTrimmed) {
      setProfileError(ar ? "الاسم الكامل مطلوب." : "Display name is required.");
      return;
    }
    setProfileBusy(true);
    setProfileError("");
    try {
      await api.saveProfile({
        displayName: nameTrimmed,
        dateOfBirth: editDob.trim() ? toLatinDigits(editDob.trim()) : null,
        sex: editSex.trim() ? editSex.trim() : null,
      });
      const latest = await api.profile();
      setProfile(latest);
      notify(ar ? "تم تحديث ملف المريض التجريبي." : "Patient profile updated.");
      changed();
    } catch (err) {
      setProfileError(safeErrorMessage(err));
    } finally {
      setProfileBusy(false);
    }
  }

  const displayName = profile?.displayName || session.name;
  const upcoming = appointments[0] ?? null;
  const latestMeasurement = record?.measurements[0] ?? null;

  const providerNameMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const appt of appointments) map.set(appt.id, appt);
    return map;
  }, [appointments]);

  if (loading) {
    return (
      <section className={styles.workspace} data-v2-portal="patient">
        <div className={styles.card}>
          <p className={styles.muted}>{ar ? "جاري تحميل بوابة المريض..." : "Loading patient care workspace..."}</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.workspace} data-v2-portal="patient">
        <div className={styles.noticeDanger} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.btnSecondary} onClick={() => void loadCore()}>
            {ar ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      </section>
    );
  }

  // Subroute: /patient/discover
  if (path === "/patient/discover" || path.startsWith("/patient/discover/")) {
    return (
      <section className={styles.workspace} data-v2-portal="patient" aria-labelledby="patient-discover-title">
        <header className={styles.banner}>
          <div className={styles.bannerHead}>
            <FoundationPortalEmblem role="patient" className={styles.emblem} />
            <div className={styles.bannerTitles}>
              <h1 id="patient-discover-title">{ar ? "اكتشاف الأطباء وحجز موعد" : "Discover doctors & book"}</h1>
              <p>
                {ar
                  ? "ابحث بالتخصص أو اسم العيادة واختر موعدًا بتوقيت ١٢ ساعة واضح."
                  : "Filter clinicians by specialty or clinic and choose an open slot in clear 12-hour time."}
              </p>
            </div>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.pill}>{ar ? "توقيت المريض ١٢ ساعة" : "12h patient time"}</span>
            <span className={styles.pillAccent}>{ar ? "حجز تجريبي" : "Synthetic booking"}</span>
          </div>
        </header>

        {receipt ? (
          <div className={styles.noticeInfo} role="status" data-booking-receipt={receipt.id}>
            <p>
              <strong>{ar ? "إيصال الحجز التجريبي:" : "Booking confirmation receipt:"}</strong>{" "}
              <span className={styles.tabular}>{receipt.id}</span> · {receipt.provider.displayName} ·{" "}
              {formatFullDate(receipt.slot.startAt, locale)} ·{" "}
              {formatTimeDisplay(receipt.slot.startAt, locale, "patient")}
            </p>
            <div className={styles.actionRow}>
              <Link href="/patient/appointments" className={styles.btnPrimary}>
                {ar ? "عرض المواعيد" : "View appointments"}
              </Link>
              <Link href="/patient" className={styles.btnSecondary}>
                {ar ? "العودة إلى رعايتي" : "Return to My care"}
              </Link>
            </div>
          </div>
        ) : null}

        <section className={styles.card}>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="discover-search">{ar ? "ابحث عن طبيب أو تخصص أو مدينة" : "Search clinician, specialty, or clinic"}</label>
              <input
                id="discover-search"
                type="search"
                className={styles.input}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={ar ? "مثال: قلب، القاهرة الجديدة..." : "e.g. Cardiology, Mariam, New Cairo..."}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.subtle}>{ar ? "تصفية التخصص" : "Specialty filter"}</span>
              <div className={styles.actionRow}>
                {specialties.map((spec) => (
                  <button
                    key={spec.key}
                    type="button"
                    className={styles.btnSecondary}
                    aria-pressed={specialtyFilter === spec.key}
                    onClick={() => setSpecialtyFilter(spec.key)}
                  >
                    {spec.displayName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredProviders.length === 0 ? (
            <div className={styles.cardInset}>
              <p className={styles.muted}>{ar ? "لا يوجد أطباء مطابقون لبحثك." : "No matching clinicians found."}</p>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setSearchQuery("");
                  setSpecialtyFilter("ALL");
                }}
              >
                {ar ? "مسح التصفية" : "Clear filters"}
              </button>
            </div>
          ) : (
            <ul className={styles.listStack}>
              {filteredProviders.map((provider) => {
                const isSelected = selectedProvider?.id === provider.id;
                const clinicSummary = provider.clinics.map((c) => `${c.displayName} (${c.city})`).join(" · ");
                return (
                  <li key={provider.id} className={styles.cardInset} data-provider-card={provider.id}>
                    <div className={styles.doctorRow}>
                      <FoundationPortrait
                        id={provider.id}
                        name={provider.displayName}
                        isDemoSurface={isDemoSurface}
                        className={styles.portrait}
                      />
                      <div className={styles.workspace}>
                        <div className={styles.cardTitleRow}>
                          <h3>{provider.displayName}</h3>
                          <span className={styles.pill}>{provider.specialty.displayName}</span>
                        </div>
                        <p className={styles.muted}>
                          <FoundationIcon name="pin" size={15} /> {clinicSummary}
                        </p>
                        <div className={styles.actionRow}>
                          <button
                            type="button"
                            className={isSelected ? styles.btnPrimary : styles.btnSecondary}
                            onClick={() => void loadSlots(provider.id)}
                            data-provider-slots-btn={provider.id}
                          >
                            <FoundationIcon name="calendar" size={16} />
                            <span>
                              {isSelected
                                ? ar
                                  ? "عرض المواعيد المختارة"
                                  : "Showing open slots"
                                : ar
                                  ? "عرض المواعيد المتاحة"
                                  : "View open slots"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selectedProvider ? (
          <section className={styles.card} aria-labelledby="slots-heading">
            <div className={styles.cardTitleRow}>
              <h2 id="slots-heading">
                {ar ? `المواعيد المتاحة مع ${selectedProvider.displayName}` : `Open slots with ${selectedProvider.displayName}`}
              </h2>
              <button type="button" className={styles.btnGhost} onClick={() => void loadSlots(selectedProvider.id)}>
                {ar ? "تحديث المواعيد" : "Refresh slots"}
              </button>
            </div>

            {slotsLoading ? (
              <p className={styles.muted}>{ar ? "جاري تحميل المواعيد..." : "Loading availability..."}</p>
            ) : slots.length === 0 ? (
              <p className={styles.muted}>
                {ar ? "لا توجد فترات مفتوحة متاحة حاليًا لهذا الطبيب." : "No open slots available for this clinician right now."}
              </p>
            ) : (
              <div className={styles.slotsWrap}>
                {slots.map((slot) => {
                  const active = selectedSlot?.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className={styles.slotChip}
                      aria-pressed={active}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setBookingError("");
                      }}
                      data-slot-chip={slot.id}
                    >
                      <FoundationIcon name="clock" size={15} />
                      <span className={styles.tabular}>
                        {formatFullDate(slot.startAt, locale)} · {formatTimeDisplay(slot.startAt, locale, "patient")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedSlot ? (
              <form className={styles.cardInset} onSubmit={(e) => void submitBooking(e)} data-booking-form="true">
                <h3>{ar ? "مراجعة وتأكيد الحجز" : "Review & confirm booking"}</h3>
                <p className={styles.muted}>
                  {selectedProvider.displayName} · {clinicNameFor(selectedProvider, selectedSlot.clinicId)} ·{" "}
                  <strong>
                    {formatFullDate(selectedSlot.startAt, locale)} ·{" "}
                    {formatTimeDisplay(selectedSlot.startAt, locale, "patient")}
                  </strong>
                </p>

                <div className={styles.field}>
                  <label htmlFor="booking-reason">{ar ? "سبب الزيارة" : "Reason for visit"}</label>
                  <textarea
                    id="booking-reason"
                    className={styles.textarea}
                    value={visitReason}
                    onChange={(event) => setVisitReason(event.target.value)}
                    placeholder={ar ? "اكتب الأعراض أو الغرض باختصار..." : "Briefly describe your reason for visiting..."}
                  />
                </div>

                {/* Unchecked nonoperative Option 1A+2A sharing preview prototype */}
                <div className={styles.consentBox} data-consent-prototype="nonoperative">
                  <label className={styles.consentCheck}>
                    <input
                      type="checkbox"
                      checked={consentPrototypeChecked}
                      onChange={(event) => setConsentPrototypeChecked(event.target.checked)}
                      data-consent-checkbox="true"
                    />
                    <span>
                      {ar
                        ? `مشاركة اختيارية مستقبلية لملخص الزيارة مع ${selectedProvider.displayName} (معاينة واجهة فقط — غير مفعلة فعليًا)`
                        : `Optional future visit-summary sharing preview with ${selectedProvider.displayName} (UI prototype only — nonoperative)`}
                    </span>
                  </label>
                  <p className={styles.subtle}>
                    {ar
                      ? `المستلم المسمى: ${selectedProvider.displayName} · الغرض: التحضير المسبق للزيارة · يمكن الإلغاء في أي وقت. إتمام الحجز وحده لا يمنح أي صلاحية وصول للسجل الطبي.`
                      : `Named recipient: ${selectedProvider.displayName} · Purpose: Pre-visit context preview · Revocable anytime. Unchecked by default; booking never grants clinical chart authority.`}
                  </p>
                </div>

                {bookingError ? (
                  <p className={styles.noticeDanger} role="alert">
                    {bookingError}
                  </p>
                ) : null}

                <div className={styles.actionRow}>
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={bookingBusy}
                    data-confirm-booking="true"
                  >
                    {bookingBusy
                      ? ar
                        ? "جاري التأكيد..."
                        : "Confirming..."
                      : ar
                        ? "تأكيد الحجز التجريبي"
                        : "Confirm synthetic booking"}
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => setSelectedSlot(null)}
                  >
                    {ar ? "تغيير الموعد" : "Change slot"}
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        ) : null}
      </section>
    );
  }

  // Subroute: /patient/appointments
  if (path === "/patient/appointments" || path.startsWith("/patient/appointments/")) {
    return (
      <section className={styles.workspace} data-v2-portal="patient" aria-labelledby="appointments-v2-title">
        <header className={styles.banner}>
          <div className={styles.bannerHead}>
            <FoundationPortalEmblem role="patient" className={styles.emblem} />
            <div className={styles.bannerTitles}>
              <h1 id="appointments-v2-title">{ar ? "مواعيدي" : "My appointments"}</h1>
              <p>{ar ? "كل المواعيد المحجوزة بتوقيت ١٢ ساعة." : "Booked synthetic visits in clear 12-hour patient time."}</p>
            </div>
          </div>
          <Link href="/patient/discover" className={styles.btnPrimary}>
            {ar ? "حجز موعد جديد" : "Book a new visit"}
          </Link>
        </header>

        <div className={styles.noticeInfo}>
          {ar
            ? "إعادة الجدولة أو إلغاء المواعيد تتطلب الربط الخلفي الكامل وليست مفعلة في هذا العرض التجريبي."
            : "Rescheduling and cancelling booked appointments require integrated Live backend flows and are explicitly deferred in this demo."}
        </div>

        <section className={styles.card}>
          {appointments.length === 0 ? (
            <p className={styles.muted}>
              {ar ? "لا توجد مواعيد محجوزة بعد." : "No booked visits yet. Open Discover to book an available slot."}
            </p>
          ) : (
            <ul className={styles.listStack}>
              {appointments.map((item) => {
                const tile = formatDayMonthTile(item.slot.startAt, locale);
                return (
                  <li key={item.id} className={styles.scheduleItem} data-appointment-item={item.id}>
                    <div className={styles.tileBadge}>
                      <strong className={styles.tabular}>{tile.day}</strong>
                      <span>{tile.month}</span>
                    </div>
                    <div className={styles.workspace}>
                      <h3>{item.provider.displayName}</h3>
                      <p className={styles.muted}>
                        {clinicNameFor(item.provider, item.slot.clinicId)} ·{" "}
                        <span className={styles.tabular}>
                          {formatFullDate(item.slot.startAt, locale)} ·{" "}
                          {formatTimeDisplay(item.slot.startAt, locale, "patient")}
                        </span>
                      </p>
                      <p className={styles.subtle}>
                        {ar ? "السبب:" : "Reason:"} {item.reason}
                      </p>
                    </div>
                    <span className={styles.pillSuccess}>{item.status}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>
    );
  }

  // Subroute: /patient/record
  if (path === "/patient/record" || path.startsWith("/patient/record/")) {
    return (
      <section className={styles.workspace} data-v2-portal="patient" aria-labelledby="record-v2-title">
        <header className={styles.banner}>
          <div className={styles.bannerHead}>
            <FoundationPortalEmblem role="patient" className={styles.emblem} />
            <div className={styles.bannerTitles}>
              <h1 id="record-v2-title">{ar ? "الملف الصحي والملخصات" : "Shared Care Record"}</h1>
              <p>
                {ar
                  ? "ملخصات الزيارات والوصفات المعتمدة من الأطباء كما صدرت."
                  : "Released consultation notes and prescriptions exactly as shared by clinicians."}
              </p>
            </div>
          </div>
          <span className={styles.pill}>{ar ? "بيانات تجريبية" : "Synthetic record"}</span>
        </header>

        <section className={styles.card}>
          <h2>{ar ? "القراءات المسجلة (مرجعية فقط)" : "Recorded telemetry readings (informational only)"}</h2>
          {latestMeasurement ? (
            <div className={styles.vitalPair}>
              <span className={styles.subtle}>{ar ? "ضغط الدم المسجل" : "Recorded blood pressure"}</span>
              <strong className={styles.tabular}>
                {latestMeasurement.systolic}/{latestMeasurement.diastolic} mmHg
              </strong>
              <span className={styles.subtle}>
                {formatFullDate(latestMeasurement.measuredAt, locale)} ·{" "}
                {ar
                  ? "قراءة مرجعية مسجلة — ليست تقييمًا تشخيصيًا."
                  : "Recorded fixture reading — informational only, not a clinical assessment."}
              </span>
            </div>
          ) : (
            <p className={styles.muted}>
              {ar ? "لا توجد قراءات حيوية مسجلة حاليًا." : "No recorded telemetry readings yet."}
            </p>
          )}
        </section>

        <section className={styles.card}>
          <h2>{ar ? "الزيارات والوصفات المعتمدة" : "Released consultations & prescriptions"}</h2>
          {!record || record.consultations.length === 0 ? (
            <p className={styles.muted}>
              {ar ? "لا توجد ملخصات منشورة بعد." : "No released consultation summaries recorded yet."}
            </p>
          ) : (
            <ul className={styles.listStack}>
              {record.consultations.map((entry) => {
                const appt = providerNameMap.get(entry.appointmentId);
                return (
                  <li key={entry.appointmentId} className={styles.cardInset} data-record-entry={entry.appointmentId}>
                    <div className={styles.cardTitleRow}>
                      <h3>{appt?.provider.displayName ?? entry.appointmentId}</h3>
                      <span className={styles.pill}>
                        {appt ? formatFullDate(appt.slot.startAt, locale) : ar ? "معتمد" : "Released"}
                      </span>
                    </div>
                    {entry.diagnosis ? (
                      <p className={styles.muted}>
                        <strong>{ar ? "التشخيص الموثق:" : "Assessment:"}</strong> {entry.diagnosis}
                      </p>
                    ) : null}
                    <p className={styles.muted}>{entry.notes || entry.followUp || entry.complaint}</p>
                    {entry.medication ? (
                      <div className={styles.noticeInfo}>
                        <strong>{ar ? "الوصفة:" : "Prescription:"}</strong>{" "}
                        <span>{entry.medication}</span>
                        {entry.dosage ? ` · ${entry.dosage}` : ""}
                        {entry.instructions ? ` — ${entry.instructions}` : ""}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>
    );
  }

  // Subroute: /patient/settings
  if (path === "/patient/settings" || path.startsWith("/patient/settings/")) {
    return (
      <section className={styles.workspace} data-v2-portal="patient" aria-labelledby="settings-v2-title">
        <header className={styles.banner}>
          <div className={styles.bannerHead}>
            <FoundationPortalEmblem role="patient" className={styles.emblem} />
            <div className={styles.bannerTitles}>
              <h1 id="settings-v2-title">{ar ? "إعدادات الحساب التجريبي" : "Patient Settings"}</h1>
              <p>
                {ar
                  ? "تعديل الاسم ينعكس فورًا في رأس البوابة وصفحة رعايتي دون إعادة تحميل."
                  : "Updating your synthetic display name refreshes the shell and My care greeting immediately."}
              </p>
            </div>
          </div>
        </header>

        <section className={styles.card}>
          <form className={styles.workspace} onSubmit={(e) => void submitProfile(e)} data-profile-form="true">
            <div className={styles.grid3}>
              <div className={styles.field}>
                <label htmlFor="profile-name">{ar ? "الاسم الكامل" : "Display name"}</label>
                <input
                  id="profile-name"
                  type="text"
                  className={styles.input}
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="profile-dob">{ar ? "تاريخ الميلاد (YYYY-MM-DD)" : "Date of birth"}</label>
                <input
                  id="profile-dob"
                  type="text"
                  className={styles.input}
                  value={editDob}
                  onChange={(event) => setEditDob(event.target.value)}
                  placeholder="1992-05-14"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="profile-sex">{ar ? "الجنس (اختياري)" : "Sex (optional)"}</label>
                <input
                  id="profile-sex"
                  type="text"
                  className={styles.input}
                  value={editSex}
                  onChange={(event) => setEditSex(event.target.value)}
                />
              </div>
            </div>

            {profileError ? (
              <p className={styles.noticeDanger} role="alert">
                {profileError}
              </p>
            ) : null}

            <div className={styles.actionRow}>
              <button type="submit" className={styles.btnPrimary} disabled={profileBusy} data-save-profile="true">
                {profileBusy ? (ar ? "جاري الحفظ..." : "Saving...") : ar ? "حفظ التغييرات" : "Save changes"}
              </button>
              <Link href="/patient" className={styles.btnSecondary}>
                {ar ? "العودة إلى رعايتي" : "Back to My care"}
              </Link>
            </div>
          </form>
        </section>
      </section>
    );
  }

  // Default: /patient (My care home)
  const latestNote = record?.consultations[0] ?? null;
  const latestAppt = latestNote ? providerNameMap.get(latestNote.appointmentId) : null;

  return (
    <section className={styles.workspace} data-v2-portal="patient" aria-labelledby="patient-home-title">
      <header className={styles.banner}>
        <div className={styles.bannerHead}>
          <FoundationPortalEmblem role="patient" className={styles.emblem} />
          <div className={styles.bannerTitles}>
            <h1 id="patient-home-title" data-patient-greeting="true">
              {ar ? `مرحبًا، ${displayName}` : `Welcome, ${displayName}`}
            </h1>
            <p>
              {ar
                ? "لوحة رعايتي المتصلة: المواعيد القادمة، البحث عن الأطباء، والملخصات المنشورة."
                : "Your connected My care overview: upcoming appointments, clinician discovery, and shared notes."}
            </p>
          </div>
        </div>
        <div className={styles.actionRow}>
          <Link href="/patient/discover" className={styles.btnPrimary}>
            <FoundationIcon name="search" size={17} />
            <span>{ar ? "احجز مع طبيب" : "Find & book doctor"}</span>
          </Link>
        </div>
      </header>

      <div className={styles.grid4}>
        <Link href="/patient/discover" className={styles.card}>
          <FoundationIcon name="search" size={24} />
          <h3>{ar ? "اكتشاف الأطباء" : "Find a doctor"}</h3>
          <p className={styles.muted}>{ar ? "تصفح الأطباء والمواعيد المتاحة" : "Browse clinicians & open slots"}</p>
        </Link>
        <Link href="/patient/appointments" className={styles.card}>
          <FoundationIcon name="calendar" size={24} />
          <h3>{ar ? "المواعيد" : "Appointments"}</h3>
          <p className={styles.muted}>
            <span className={styles.tabular}>{appointments.length}</span>{" "}
            {ar ? "مواعيد مسجلة" : "booked visits"}
          </p>
        </Link>
        <Link href="/patient/record" className={styles.card}>
          <FoundationIcon name="doc" size={24} />
          <h3>{ar ? "الملف الصحي" : "Care record"}</h3>
          <p className={styles.muted}>
            <span className={styles.tabular}>{record?.consultations.length ?? 0}</span>{" "}
            {ar ? "ملخصات معتمدة" : "released notes"}
          </p>
        </Link>
        <Link href="/patient/settings" className={styles.card}>
          <FoundationIcon name="user" size={24} />
          <h3>{ar ? "الإعدادات" : "Profile & preferences"}</h3>
          <p className={styles.muted}>{displayName}</p>
        </Link>
      </div>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h2>{ar ? "الموعد القادم" : "Next appointment"}</h2>
            <Link href="/patient/appointments" className={styles.btnGhost}>
              {ar ? "كل المواعيد" : "All appointments"}
            </Link>
          </div>
          {upcoming ? (
            <div className={styles.cardInset}>
              <div className={styles.cardTitleRow}>
                <h3>{upcoming.provider.displayName}</h3>
                <span className={styles.pillSuccess}>{upcoming.status}</span>
              </div>
              <p className={styles.muted}>
                {clinicNameFor(upcoming.provider, upcoming.slot.clinicId)} ·{" "}
                <span className={styles.tabular}>
                  {formatFullDate(upcoming.slot.startAt, locale)} ·{" "}
                  {formatTimeDisplay(upcoming.slot.startAt, locale, "patient")}
                </span>
              </p>
              <p className={styles.subtle}>{upcoming.reason}</p>
            </div>
          ) : (
            <div className={styles.cardInset}>
              <p className={styles.muted}>
                {ar ? "لا يوجد موعد محجوز حاليًا." : "No booked appointment yet."}
              </p>
              <Link href="/patient/discover" className={styles.btnPrimary}>
                {ar ? "حجز موعد الآن" : "Book a visit"}
              </Link>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h2>{ar ? "آخر قراءة وملخص" : "Latest reading & shared note"}</h2>
            <Link href="/patient/record" className={styles.btnGhost}>
              {ar ? "فتح الملف" : "Open record"}
            </Link>
          </div>
          {latestMeasurement ? (
            <div className={styles.vitalPair}>
              <span className={styles.subtle}>{ar ? "ضغط الدم المسجل" : "Recorded blood pressure"}</span>
              <strong className={styles.tabular}>
                {latestMeasurement.systolic}/{latestMeasurement.diastolic} mmHg
              </strong>
              <span className={styles.subtle}>
                {formatFullDate(latestMeasurement.measuredAt, locale)} ·{" "}
                {ar ? "قراءة مرجعية تجريبية فقط." : "Informational sample telemetry only."}
              </span>
            </div>
          ) : (
            <p className={styles.muted}>{ar ? "لا توجد قراءات حيوية مسجلة." : "No sample readings recorded."}</p>
          )}
          {latestNote ? (
            <div className={styles.cardInset}>
              <h3>{latestAppt?.provider.displayName ?? latestNote.appointmentId}</h3>
              <p className={styles.muted}>{latestNote.notes || latestNote.diagnosis}</p>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
