import { useLocale } from "../../lib/i18n/context";

/** Staff-only copy. Source identities, medication and directions are never translated. */
export function useStaffCopy() {
  const { locale, t } = useLocale();
  return {
    c: (en: string, ar: string) => locale === "ar" ? ar : en,
    status: (value: string) => {
      const labels: Record<string, string> = {
        Received: "الوصفة وصلت · تجريبي",
        Preparing: "جاري التجهيز · تجريبي",
        Dispensed: "اتسجل صرف البند بالكامل · تجريبي",
        Active: "نشط", Clinic: "عيادة", Laboratory: "معمل", Pharmacy: "صيدلية",
        Patient: "مريض", Clinician: "دكتور", "Lab staff": "فريق المعمل", "Pharmacy staff": "فريق الصيدلية",
      };
      return locale === "ar" ? labels[value] ?? t("Unknown") : value;
    },
  };
}
