"use client";

import { useRef, useState } from "react";
import { useLocale } from "../../../lib/i18n/context";
import { FoundationIcon, FoundationPortalEmblem } from "../foundation/index";
import styles from "./demo-v2.module.css";

type ConceptTab = "orders" | "specimens" | "reports";

const TAB_ORDER: readonly ConceptTab[] = ["orders", "specimens", "reports"];

export function LaboratoryDemoV2() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [activeTab, setActiveTab] = useState<ConceptTab>("orders");
  const tabRefs = useRef<Partial<Record<ConceptTab, HTMLButtonElement | null>>>({});

  function selectAndFocusTab(tab: ConceptTab) {
    setActiveTab(tab);
    tabRefs.current[tab]?.focus();
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, current: ConceptTab) {
    const idx = TAB_ORDER.indexOf(current);
    if (idx === -1) return;

    if (event.key === "Home") {
      event.preventDefault();
      selectAndFocusTab(TAB_ORDER[0]);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      selectAndFocusTab(TAB_ORDER[TAB_ORDER.length - 1]);
      return;
    }

    const forwardKey = ar ? "ArrowLeft" : "ArrowRight";
    const backwardKey = ar ? "ArrowRight" : "ArrowLeft";
    if (event.key === forwardKey) {
      event.preventDefault();
      selectAndFocusTab(TAB_ORDER[(idx + 1) % TAB_ORDER.length]);
      return;
    }
    if (event.key === backwardKey) {
      event.preventDefault();
      selectAndFocusTab(TAB_ORDER[(idx - 1 + TAB_ORDER.length) % TAB_ORDER.length]);
    }
  }

  const tabs: { id: ConceptTab; labelEn: string; labelAr: string }[] = [
    { id: "orders", labelEn: "Order Routing (Future)", labelAr: "طلبات التحاليل (مستقبلي)" },
    { id: "specimens", labelEn: "Specimen Status (Future)", labelAr: "تتبع العينات (مستقبلي)" },
    { id: "reports", labelEn: "Result Release (Future)", labelAr: "مراجعة النتائج (مستقبلي)" },
  ];

  return (
    <section className={styles.workspace} data-v2-portal="laboratory" aria-labelledby="lab-v2-title">
      <header className={styles.banner}>
        <div className={styles.bannerHead}>
          <FoundationPortalEmblem role="laboratory" className={styles.emblem} />
          <div className={styles.bannerTitles}>
            <h1 id="lab-v2-title">
              {ar ? "بوابة المعمل — نموذج مستقبلي" : "Laboratory — Future Concept"}
            </h1>
            <p>
              {ar
                ? "تصور تخطيطي لمسار المعامل المستقبلي. غير متصل ولا يعرض أي عينات أو نتائج حية."
                : "Architectural concept preview only. Specimen collection and live lab results are not implemented in this phase."}
            </p>
          </div>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.pillWarning} data-lab-future-badge="true">
            <FoundationIcon name="warning" size={15} />{" "}
            <span>{ar ? "ميزة مستقبلية · غير متاحة حاليًا" : "FUTURE · CONCEPT · NOT LIVE"}</span>
          </span>
        </div>
      </header>

      <div className={styles.noticeWarning} role="note">
        <strong>{ar ? "تنبيه الحوكمة الطبية (#124):" : "Governance Boundary (#124 NO-GO):"}</strong>{" "}
        {ar
          ? "لا تنشئ هذه البوابة أي طلبات تحاليل أو نتائج مرضى حقيقية أو اصطناعية حتى اعتماد العقود السريرية والربط الخلفي في مراحل لاحقة."
          : "No live or synthetic diagnostic values are generated or accepted here. Laboratory workflows await future contract and backend authorization."}
      </div>

      <section className={styles.card} aria-labelledby="lab-concept-tabs">
        <div className={styles.cardTitleRow}>
          <h2 id="lab-concept-tabs">{ar ? "نطاق القدرات المستقبلية المخططة" : "Planned future capability boundaries"}</h2>
        </div>

        <div className={styles.actionRow} role="tablist" aria-label={ar ? "أقسام تصور المعمل" : "Laboratory concept tabs"}>
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`lab-tab-${tab.id}`}
                aria-controls={`lab-panel-${tab.id}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                className={styles.btnSecondary}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              >
                {ar ? tab.labelAr : tab.labelEn}
              </button>
            );
          })}
        </div>

        <div
          id={`lab-panel-${activeTab}`}
          className={styles.cardInset}
          role="tabpanel"
          aria-labelledby={`lab-tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === "orders" ? (
            <>
              <h3>{ar ? "تحويل طلبات التحاليل المحدودة" : "Order Routing Preview (Inactive)"}</h3>
              <p className={styles.muted}>
                {ar
                  ? "يتطلب تفعيل هذا المسار موافقة منفصلة على نموذج الطلبات الموجهة دون كشف السجل الكامل للمريض."
                  : "Future routing will require organization-scoped order artifacts without exposing full patient charts."}
              </p>
            </>
          ) : activeTab === "specimens" ? (
            <>
              <h3>{ar ? "حالات استلام وفحص العينات" : "Specimen Lifecycle Preview (Inactive)"}</h3>
              <p className={styles.muted}>
                {ar
                  ? "لا توجد أي قوائم عينات فعالة في هذا الإصدار؛ جميع الإجراءات معطلة عن قصد."
                  : "No active specimen queue or write controls exist in this release; mutation controls are intentionally omitted."}
              </p>
            </>
          ) : (
            <>
              <h3>{ar ? "سياسة اعتماد نتائج التحاليل" : "Result Verification Policy (Inactive)"}</h3>
              <p className={styles.muted}>
                {ar
                  ? "لن تُنشر نتائج تحاليل إلا عبر مسارات تحقق طبية معتمدة ومفصولة عن هذه الواجهة التجريبية."
                  : "Diagnostic reports cannot be fabricated in the browser demo and remain strictly gated behind future clinical release controls."}
              </p>
            </>
          )}
        </div>
      </section>
    </section>
  );
}
