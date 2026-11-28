"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Fulfillment } from "../../../lib/api/contracts";
import { safeErrorMessage } from "../../../lib/api/errors";
import { useLocale } from "../../../lib/i18n/context";
import { useApp } from "../../context";
import { FoundationIcon, FoundationPortalEmblem } from "../foundation/index";
import { useStaffCopy } from "../staff-copy";
import styles from "./demo-v2.module.css";

interface RoutedArtifactItem {
  id: string;
  patient: string;
  provider: string;
  medication: string;
  dosage: string;
  lab: string;
  fulfillment: Fulfillment;
}

export function PharmacyDemoV2() {
  const { api, refresh, notify, changed } = useApp();
  const { locale } = useLocale();
  const { c, status, copy } = useStaffCopy();
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const [items, setItems] = useState<RoutedArtifactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());
  const busyIdsRef = useRef<Set<string>>(new Set());
  const loadSeqRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError("");
    try {
      // Filter empty/whitespace medications at UI layer only, preserving adapter artifacts() contract for LAB_STAFF.
      const routed = (await api.artifacts()).filter((entry) => Boolean(entry.medication?.trim()));
      if (!isMountedRef.current || loadSeqRef.current !== seq) return;
      const settled = await Promise.all(
        routed.map(async (entry) => ({
          ...entry,
          fulfillment: await api.fulfillment(entry.id),
        })),
      );
      if (!isMountedRef.current || loadSeqRef.current !== seq) return;
      setItems(settled);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [
        item.id,
        item.patient,
        item.provider,
        item.medication,
        item.dosage,
        item.fulfillment.prescription,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [items, query]);

  async function transition(
    item: RoutedArtifactItem,
    nextStatus: "Preparing" | "Dispensed",
  ) {
    if (busyIdsRef.current.has(item.id)) return;
    busyIdsRef.current.add(item.id);
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    setError("");
    try {
      await api.updateFulfillment(
        {
          ...item.fulfillment,
          prescription: nextStatus,
        },
        item.id,
      );
      if (!isMountedRef.current) return;
      const currentAr = localeRef.current === "ar";
      const statusLabel =
        nextStatus === "Preparing"
          ? currentAr
            ? "جاري التجهيز · تجريبي"
            : "Preparing"
          : currentAr
            ? "اتسجل صرف البند بالكامل · تجريبي"
            : "Dispensed";
      notify(
        currentAr
          ? `تم تحديث حالة الصرف إلى ${statusLabel}.`
          : `Fulfillment status updated to ${statusLabel}.`,
      );
      changed();
    } catch (err) {
      if (isMountedRef.current) {
        setError(safeErrorMessage(err));
      }
    } finally {
      busyIdsRef.current.delete(item.id);
      if (isMountedRef.current) {
        setBusyIds((prev) => {
          if (!prev.has(item.id)) return prev;
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    }
  }

  return (
    <section className={styles.workspace} data-v2-portal="pharmacy" aria-labelledby="pharmacy-v2-title">
      <header className={styles.banner}>
        <div className={styles.bannerHead}>
          <FoundationPortalEmblem role="pharmacy" className={styles.emblem} />
          <div className={styles.bannerTitles}>
            <h1 id="pharmacy-v2-title">{c("Pharmacy Fulfillment", "بوابة صرف الصيدلية")}</h1>
            <p>
              {c(
                "Inspect routed prescriptions with purpose-limited access and deterministic Dispensed lock.",
                "مراجعة الوصفات المحوّلة ضمن نطاق الصرف المحدد دون أي وصول للسجل السريري الكامل.",
              )}
            </p>
          </div>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.pill}>{c("Routed scope only", "نطاق صرف محدود")}</span>
          <span className={styles.pillAccent}>{c("24h operational time", "توقيت 24 ساعة")}</span>
        </div>
      </header>

      <div className={styles.noticeInfo}>
        {c(
          "Source medication names and clinical dosage text are displayed verbatim without modification or translation.",
          "تُعرض أسماء الأدوية وتعليمات الطبيب كما صدرت حرفيًا دون تعديل أو ترجمة.",
        )}
      </div>

      {!loading && error ? (
        <div className={styles.noticeDanger} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.btnSecondary} onClick={() => void load()}>
            {c("Retry", "إعادة المحاولة")}
          </button>
        </div>
      ) : (
        <section className={styles.card}>
          <h2 className="sr-only">{c("Routed prescription items", "قائمة الوصفات المحوّلة")}</h2>
          <div className={styles.field}>
            <label htmlFor="pharmacy-search">{c("Filter assigned prescriptions", "تصفية الوصفات المسندة")}</label>
            <input
              id="pharmacy-search"
              type="search"
              className={styles.input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholderRx}
            />
          </div>

          {loading ? (
            <p className={styles.muted}>{c("Loading routed prescriptions...", "جاري تحميل الوصفات المحوّلة...")}</p>
          ) : filtered.length === 0 ? (
            <p className={styles.muted}>
              {query.trim()
                ? copy.noMatchingRoutes
                : c("No routed prescriptions available.", "لا توجد وصفات محوّلة حاليًا.")}
            </p>
          ) : (
            <ul className={styles.listStack}>
              {filtered.map((item) => {
                const rxState = item.fulfillment.prescription;
                const terminal = rxState === "Dispensed";
                const itemBusy = busyIds.has(item.id);
                return (
                  <li key={item.id} className={styles.cardInset} data-pharmacy-item={item.id}>
                    <div className={styles.cardTitleRow}>
                      <h3>
                        <FoundationIcon name="pharmacy-rx" size={18} />{" "}
                        <span>{item.medication}</span>
                      </h3>
                      <span
                        className={
                          terminal
                            ? styles.pillSuccess
                            : rxState === "Preparing"
                              ? styles.pillWarning
                              : styles.pill
                        }
                      >
                        {status(rxState)}
                      </span>
                    </div>
                    <p className={styles.muted}>
                      {c("Route ref", "مرجع المسار")}: <strong className={styles.tabular}>{item.id}</strong> ·{" "}
                      {c("Patient", "المريض")}: <strong>{item.patient}</strong> ·{" "}
                      {c("Clinician", "الطبيب")}: <strong>{item.provider}</strong>
                    </p>
                    <p className={styles.muted}>
                      {c("Source dosage", "الجرعة الأصلية")}: <span>{item.dosage || "—"}</span>
                    </p>
                    <div className={styles.actionRow}>
                      {rxState === "Received" ? (
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          disabled={itemBusy}
                          onClick={() => void transition(item, "Preparing")}
                          data-pharmacy-action="Preparing"
                        >
                          {c("Mark Preparing", "بدء التجهيز")}
                        </button>
                      ) : null}
                      {rxState === "Preparing" ? (
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          disabled={itemBusy}
                          onClick={() => void transition(item, "Dispensed")}
                          data-pharmacy-action="Dispensed"
                        >
                          {c("Mark Dispensed", "تأكيد التسليم بالكامل")}
                        </button>
                      ) : null}
                      {terminal ? (
                        <span className={styles.pillSuccess} data-pharmacy-terminal="true">
                          <FoundationIcon name="lock" size={15} />{" "}
                          {c("Terminal status — Dispensed locked", "حالة نهائية — تم القفل بعد التسليم")}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </section>
  );
}
