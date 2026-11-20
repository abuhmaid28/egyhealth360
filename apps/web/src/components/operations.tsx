"use client";
import { PharmacyLiveRead } from "./v2/pharmacy-live-read";
import { directoryLabel } from "../lib/presentation";
import { useLocale } from "../lib/i18n/context";
import Link from "next/link";
import { useApp } from "./context";
import {
  Card,
  CardTitle,
  Detail,
  Heading,
  Resource,
  useResource,
} from "./ui";
import { StaffWorkspace } from "./v2/staff-workspace";
import { PharmacyWorkspace } from "./v2/pharmacy-workspace";
import { AdminWorkspace } from "./v2/admin-workspace";
import { LaboratoryFuture } from "./v2/laboratory-future";
export function OperationsScreen({ path }: { path: string }) {
  return <StaffWorkspace><OperationsContent path={path} /></StaffWorkspace>;
}
function OperationsContent({ path }: { path: string }) {
  const { t, locale } = useLocale();
  const { session, api } = useApp();
  const admin = session.role === "ADMIN";
  const lab = session.role === "LAB_STAFF";
  if (api.mode === "live" && session.role === "PHARMACY_STAFF" && api.pharmacyRead && !path.endsWith("/settings")) return <PharmacyLiveRead engine={api.pharmacyRead} />;
  if (api.mode === "live" && !path.endsWith("/settings")) {
    const message =
      locale === "ar"
        ? admin
          ? "إدارة المستخدمين والمؤسسات مش متاحة في الواجهة دي. تقدر تستعرض الدليل العام."
          : lab
            ? "طلبات ونتائج المعمل مش متاحة في وضع الرعاية المتصلة."
            : "متابعة وصرف الوصفات الطبية مش متاحين في الواجهة دي حاليًا."
        : admin
          ? "People and organization management are unavailable in this interface. You can browse the public directory."
          : lab
            ? "Laboratory orders and results are unavailable in Live mode."
            : "Prescription fulfillment is not available in this interface yet.";
    return (
      <>
        <Heading
          eyebrow={t("Operational workspace")}
          title={t(
            admin
              ? "Operations overview"
              : lab
                ? "Request inbox"
                : "Prescription inbox",
          )}
          description={t(
            admin
              ? "Coordinate the platform without access to patient clinical records."
              : "Your operational scope follows your current organization membership.",
          )}
        />
        <Card>
          <CardTitle
            title={
              locale === "ar"
                ? "الإمكانية دي مش متاحة في الواجهة الحالية"
                : "Unavailable in the current Live interface"
            }
          />
          <p>{message}</p>
          <p className="muted">
            {t(
              admin
                ? "Admin has no patient-record, consultation, prescription, or lab-result access."
                : "Only routed prescriptions or laboratory requests belong in this workspace. No patient record browsing is provided.",
            )}
          </p>
          {admin && path !== "/admin/directory" && (
            <Link className="button secondary" href="/admin/directory">
              {t("Directory")}
            </Link>
          )}
        </Card>
        {admin && path === "/admin/directory" && <DirectoryOverview />}
      </>
    );
  }
  if (path.endsWith("/settings"))
    return (
      <>
        <Heading
          title={t("Workspace settings")}
          description={t(
            admin
              ? "Coordinate the platform without access to patient clinical records."
              : "Your operational scope follows your current organization membership.",
          )}
        />
        <Card>
          <Detail
            icon="shield"
            title={t(
              session.role === "ADMIN"
                ? "Patient records are not available"
                : "Assigned requests only",
            )}
          >
            {t(
              session.role === "ADMIN"
                ? "Admin has no patient-record, consultation, prescription, or lab-result access."
                : "Only routed prescriptions or laboratory requests belong in this workspace. No patient record browsing is provided.",
            )}
          </Detail>
        </Card>
      </>
    );
  if (session.role === "ADMIN") return <AdminWorkspace path={path} directory={path === "/admin/directory" ? <DirectoryOverview /> : undefined} />;
  if (lab) return <LaboratoryFuture />;
  return <PharmacyWorkspace />;
}
function DirectoryOverview() {
  const { t } = useLocale();

  const { api, preview } = useApp();
  const d = useResource(() => api.providers(), [api]);
  return (
    <Card>
      <CardTitle title={t("Published provider directory")} />
      <Resource resource={d} preview={preview}>
        {(rows) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Provider")}</th>
                  <th>{t("Specialty")}</th>
                  <th>{t("Clinic")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.displayName}</td>
                    <td>{directoryLabel(p.specialty.displayName, t)}</td>
                    <td>{p.clinics.map((c) => c.displayName).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Resource>
    </Card>
  );
}
