"use client";
import Link from "next/link";
import { useState } from "react";
import type { Fulfillment } from "../lib/api/contracts";
import { useApp } from "./context";
import { Stat } from "./patient";
import {
  Avatar,
  Badge,
  Card,
  CardTitle,
  Detail,
  Empty,
  Field,
  Heading,
  Icon,
  Resource,
  useResource,
} from "./ui";
export function OperationsScreen({ path }: { path: string }) {
  const { session } = useApp();
  if (session.role === "ADMIN") return <Admin path={path} />;
  if (path.endsWith("/settings"))
    return (
      <>
        <Heading
          title="Workspace settings"
          description="Your operational scope follows your current organization membership."
        />
        <Card>
          <Detail icon="shield" title="Artifact-scoped workspace">
            Only routed prescriptions or laboratory requests belong in this
            workspace. No patient record browsing is provided.
          </Detail>
        </Card>
      </>
    );
  return <FulfillmentInbox lab={session.role === "LAB_STAFF"} />;
}
function FulfillmentInbox({ lab }: { lab: boolean }) {
  const { api, preview, refresh } = useApp();
  const [selected, setSelected] = useState("");
  const rows = useResource(() => api.artifacts(), [api, refresh]);
  return (
    <>
      <Heading
        eyebrow={lab ? "Nile Diagnostics" : "CarePoint Pharmacy"}
        title={
          lab
            ? "Every result, a clearer next step."
            : "Care continues beyond the visit."
        }
        description={
          lab
            ? "Review incoming laboratory requests and share results with the care journey."
            : "Review prescriptions and keep the preparation journey moving."
        }
      />
      <Resource resource={rows} preview={preview}>
        {(all) => {
          const list = all.filter((a) => (lab ? !!a.lab : !!a.medication));
          const artifact = list.find((a) => a.id === selected) ?? list[0];
          return (
            <>
              <div className="stats-grid">
                <Stat
                  icon={lab ? "lab" : "record"}
                  label={lab ? "Routed lab requests" : "Routed prescriptions"}
                  value={String(list.length).padStart(2, "0")}
                  note="Synthetic organization inbox"
                />
                <Card className="scope-card">
                  <Icon name="shield" size={28} />
                  <div>
                    <h3>Only what you need for this task</h3>
                    <p>
                      No patient record, clinician notes, or unrelated
                      artifacts.
                    </p>
                  </div>
                </Card>
              </div>
              <div className="two-column">
                <Card>
                  <CardTitle
                    title={lab ? "Incoming requests" : "Incoming prescriptions"}
                  />
                  {list.length ? (
                    <div className="inbox-list">
                      {list.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setSelected(a.id)}
                          className={artifact?.id === a.id ? "selected" : ""}
                        >
                          <Avatar name={a.patient} />
                          <span>
                            <strong>{a.patient}</strong>
                            <small>{lab ? a.lab : a.medication}</small>
                            <small>{a.id}</small>
                          </span>
                          <Icon name="chevron" size={17} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title={
                        lab
                          ? "Your request inbox is clear"
                          : "Your prescription inbox is clear"
                      }
                      description="Release a consultation with a matching artifact from the Doctor workspace to continue the Golden Demo."
                    />
                  )}
                </Card>
                {artifact ? (
                  <ArtifactDetail
                    key={artifact.id}
                    artifact={artifact}
                    lab={lab}
                  />
                ) : (
                  <Card className="tinted">
                    <CardTitle title="A connected handoff" />
                    <p className="body-copy">
                      The clinician’s released artifact appears here with the
                      minimum context needed to complete the task.
                    </p>
                    <Badge tone="soft">Synthetic fulfillment only</Badge>
                  </Card>
                )}
              </div>
            </>
          );
        }}
      </Resource>
    </>
  );
}
function ArtifactDetail({
  artifact: a,
  lab,
}: {
  artifact: {
    id: string;
    patient: string;
    provider: string;
    medication: string;
    dosage: string;
    lab: string;
  };
  lab: boolean;
}) {
  const { api, refresh, preview, notify, changed } = useApp();
  const data = useResource(() => api.fulfillment(a.id), [api, a.id, refresh]);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (f: Fulfillment) => {
    setBusy(true);
    setError("");
    try {
      await api.updateFulfillment(f, a.id);
      changed();
      notify(
        lab
          ? "Laboratory status updated in the demo."
          : "Prescription status updated in the demo.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardTitle
        title={lab ? "Laboratory request details" : "Prescription details"}
      />
      <Resource resource={data} preview={preview}>
        {(f) => (
          <>
            <div className="inline">
              <Avatar name={a.patient} />
              <div>
                <h3>{a.patient}</h3>
                <small className="muted">{a.provider}</small>
              </div>
              <Badge tone="amber">{lab ? f.lab : f.prescription}</Badge>
            </div>
            <div className="confirmation-details">
              <Detail
                icon={lab ? "lab" : "pill"}
                title={lab ? "Requested test" : "Medication"}
              >
                {lab ? a.lab : a.medication}
              </Detail>
              {!lab && (
                <Detail icon="record" title="Clinician directions">
                  {a.dosage}
                </Detail>
              )}
              <Detail icon="shield" title="Routing scope">
                {lab ? "Nile Diagnostics" : "CarePoint Pharmacy"} · synthetic
                routed artifact
              </Detail>
            </div>
            {lab ? (
              <>
                {f.lab === "Requested" && (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => {
                      void save({ ...f, lab: "In progress" });
                    }}
                  >
                    Start processing
                    <Icon name="arrow" size={17} />
                  </button>
                )}
                {f.lab === "In progress" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save({
                        ...f,
                        lab: "Result ready",
                        result: result.trim(),
                      });
                    }}
                  >
                    <Field
                      label="Result text"
                      hint="Human-entered synthetic result. No automated interpretation."
                    >
                      <textarea
                        rows={4}
                        required
                        maxLength={2000}
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        placeholder="Enter result, units and reference context as applicable"
                      />
                    </Field>
                    <button
                      className="button primary"
                      disabled={busy || !result.trim()}
                    >
                      Share demo result
                      <Icon name="check" size={18} />
                    </button>
                  </form>
                )}
                {f.lab === "Result ready" && (
                  <div className="result-text">
                    <h3>Shared result</h3>
                    <p>{f.result}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="workflow-steps">
                  {["Received", "Preparing", "Dispensed"].map((s, i) => (
                    <span
                      className={
                        ["Received", "Preparing", "Dispensed"].indexOf(
                          f.prescription,
                        ) >= i
                          ? "done"
                          : ""
                      }
                      key={s}
                    >
                      <b>{i + 1}</b>
                      {s}
                    </span>
                  ))}
                </div>
                {f.prescription !== "Dispensed" && (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => {
                      void save({
                        ...f,
                        prescription:
                          f.prescription === "Received"
                            ? "Preparing"
                            : "Dispensed",
                      });
                    }}
                  >
                    {f.prescription === "Received"
                      ? "Begin preparation"
                      : "Confirm full-item dispensing"}
                    <Icon name="check" size={17} />
                  </button>
                )}
                <p className="small muted">
                  Full-item simulation only. No partial quantities,
                  substitutions, refills, or inventory management.
                </p>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </Resource>
    </Card>
  );
}
function Admin({ path }: { path: string }) {
  const { api, preview } = useApp();
  const data = useResource(() => api.operations(), [api]);
  const names: Record<string, string> = {
    "/admin": "A connected operational picture.",
    "/admin/organizations": "Organizations & clinics",
    "/admin/users": "Workspace users",
    "/admin/directory": "Public directory overview",
    "/admin/scheduling": "High-level scheduling configuration",
  };
  return (
    <>
      <Heading
        eyebrow="Operational workspace"
        title={names[path] ?? "Operations"}
        description="Coordinate the platform without access to patient clinical records."
      />
      <Resource resource={data} preview={preview}>
        {(o) => (
          <>
            {path === "/admin" && (
              <>
                <div className="stats-grid">
                  <Stat
                    icon="building"
                    label="Organizations"
                    value={String(o.organizations.length).padStart(2, "0")}
                    note="Synthetic operating network"
                  />
                  <Stat
                    icon="user"
                    label="Workspace users"
                    value={String(o.users.length).padStart(2, "0")}
                    note="Fixed role overview"
                  />
                  <Stat
                    icon="calendar"
                    label="Scheduling scope"
                    value="02"
                    note="Clinic configuration overview"
                  />
                </div>
                <div className="two-column">
                  <Card>
                    <CardTitle
                      title="Your operating network"
                      href="/admin/organizations"
                    />
                    {o.organizations.map((v) => (
                      <div className="operation-row" key={v.name}>
                        <span className="icon-tile">
                          <Icon name="building" />
                        </span>
                        <div>
                          <h3>{v.name}</h3>
                          <p>{v.kind}</p>
                        </div>
                        <Badge>{v.status}</Badge>
                      </div>
                    ))}
                  </Card>
                  <div className="stack">
                    <Card className="tinted">
                      <CardTitle title="Administration, with boundaries" />
                      <Detail icon="shield" title="No clinical entitlement">
                        Admin has no patient-record, consultation, prescription,
                        or lab-result access.
                      </Detail>
                      <p className="muted">
                        Membership and directory publication are operational
                        scope. They never grant clinical authority.
                      </p>
                    </Card>
                    <Card>
                      <CardTitle title="Quick links" />
                      <div className="admin-links">
                        <Link href="/admin/users">
                          Review users
                          <Icon name="arrow" size={16} />
                        </Link>
                        <Link href="/admin/directory">
                          Review directory
                          <Icon name="arrow" size={16} />
                        </Link>
                        <Link href="/admin/scheduling">
                          Scheduling overview
                          <Icon name="arrow" size={16} />
                        </Link>
                      </div>
                    </Card>
                  </div>
                </div>
              </>
            )}
            {path === "/admin/organizations" && (
              <Card>
                <CardTitle title="Organization network" />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Organization</th>
                        <th>Kind</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.organizations.map((v) => (
                        <tr key={v.name}>
                          <td>
                            <strong>{v.name}</strong>
                          </td>
                          <td>{v.kind}</td>
                          <td>
                            <Badge>{v.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            {path === "/admin/users" && (
              <Card>
                <CardTitle title="Account overview" />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.users.map((v) => (
                        <tr key={v.name}>
                          <td>{v.name}</td>
                          <td>{v.role}</td>
                          <td>
                            <Badge>{v.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            {path === "/admin/directory" && <DirectoryOverview />}
            {path === "/admin/scheduling" && (
              <Card>
                <CardTitle title="Clinic settings overview" />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Clinic</th>
                        <th>Time zone</th>
                        <th>Publication</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.organizations
                        .filter((v) => v.kind === "Clinic")
                        .map((v) => (
                          <tr key={v.name}>
                            <td>{v.name}</td>
                            <td>Africa/Cairo</td>
                            <td>
                              <Badge tone="soft">Finite intervals</Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted">
                  Read-only UI overview. No configuration mutation endpoint
                  exists on main. Lead-time and horizon values will come from
                  the approved backend integration.
                </p>
              </Card>
            )}
            <Card className="directory-note">
              <Icon name="shield" />
              <p>
                Operational presentation data only. This shell does not execute
                organization, user, publication, or configuration mutations.
              </p>
            </Card>
          </>
        )}
      </Resource>
    </>
  );
}
function DirectoryOverview() {
  const { api, preview } = useApp();
  const d = useResource(() => api.providers(), [api]);
  return (
    <Card>
      <CardTitle title="Published provider directory" />
      <Resource resource={d} preview={preview}>
        {(rows) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Specialty</th>
                  <th>Clinic</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.displayName}</td>
                    <td>{p.specialty.displayName}</td>
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
