"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Operations } from "../../../lib/api/contracts";
import { safeErrorMessage } from "../../../lib/api/errors";
import { useApp } from "../../context";
import { FoundationIcon, FoundationPortalEmblem } from "../foundation/index";
import { useStaffCopy } from "../staff-copy";
import styles from "./demo-v2.module.css";

export function AdminDemoV2() {
  const { api, refresh } = useApp();
  const { c, status, copy } = useStaffCopy();

  const [data, setData] = useState<Operations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
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
      const next = await api.operations();
      if (!isMountedRef.current || loadSeqRef.current !== seq) return;
      setData(next);
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

  const users = useMemo(() => {
    const all = data?.users ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((u) =>
      [u.name, u.role, u.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [data, query]);

  return (
    <section className={styles.workspace} data-v2-portal="admin" aria-labelledby="admin-v2-title">
      <header className={styles.banner}>
        <div className={styles.bannerHead}>
          <FoundationPortalEmblem role="admin" className={styles.emblem} />
          <div className={styles.bannerTitles}>
            <h1 id="admin-v2-title">{c("Operations Directory", "دليل التشغيل والإدارة")}</h1>
            <p>
              {c(
                "Operational organizations and role membership directory only — zero clinical chart access.",
                "عرض دليل الجهات التشغيلية والحسابات فقط — دون أي وصول للبيانات أو السجلات الطبية.",
              )}
            </p>
          </div>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.pill}>
            <FoundationIcon name="lock" size={14} />{" "}
            <span>{c("Operational boundary", "نطاق تشغيلي فقط")}</span>
          </span>
        </div>
      </header>

      <div className={styles.noticeInfo}>
        {c(
          "No clinical payloads, patient counts, impersonation, or assignment creation controls exist for ADMIN.",
          "لا تملك بوابة الإدارة أي وصول لملفات المرضى أو أعداد الحالات أو الانتحال أو إسناد الأطباء.",
        )}
      </div>

      {loading ? (
        <section className={styles.card}>
          <p className={styles.muted}>{c("Loading operational directory...", "جاري تحميل الدليل التشغيلي...")}</p>
        </section>
      ) : error ? (
        <div className={styles.noticeDanger} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.btnSecondary} onClick={() => void load()}>
            {c("Retry", "إعادة المحاولة")}
          </button>
        </div>
      ) : (
        <div className={styles.grid2}>
          <section className={styles.card}>
            <h2>{c("Active facilities & services", "الجهات والمنشآت النشطة")}</h2>
            {(data?.organizations ?? []).length === 0 ? (
              <p className={styles.muted}>{c("No organizations returned.", "لا توجد جهات مسجلة.")}</p>
            ) : (
              <ul className={styles.listStack}>
                {data?.organizations.map((org) => (
                  <li key={org.name} className={styles.cardInset}>
                    <div className={styles.cardTitleRow}>
                      <h3>{org.name}</h3>
                      <span className={styles.pillSuccess}>{status(org.status)}</span>
                    </div>
                    <p className={styles.muted}>
                      {status(org.kind)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <h2>{c("Operational account directory", "دليل الحسابات التشغيلية")}</h2>
            <div className={styles.field}>
              <label htmlFor="admin-user-search">{c("Search directory", "البحث في الدليل")}</label>
              <input
                id="admin-user-search"
                type="search"
                className={styles.input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholderUsers}
              />
            </div>

            {users.length === 0 ? (
              <p className={styles.muted}>{copy.noMatchingUsers}</p>
            ) : (
              <ul className={styles.listStack}>
                {users.map((u) => (
                  <li key={`${u.name}-${u.role}`} className={styles.cardInset}>
                    <div className={styles.cardTitleRow}>
                      <h3>{u.name}</h3>
                      <span className={styles.pill}>{status(u.role)}</span>
                    </div>
                    <p className={styles.muted}>
                      {c("Directory status", "حالة الحساب")}: <span>{status(u.status)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
