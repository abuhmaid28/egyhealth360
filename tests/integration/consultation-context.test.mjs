import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  isolatedConsultations,
  openingCounts,
} from "../support/consultations.mjs";
import { rejectBooking } from "../support/bookings.mjs";

test("booking-scoped context recovers OPEN/CLOSED without writes or historical command/identity disclosure", () =>
  isolatedConsultations(async (f) => {
    const b = await f.ready(),
      opened = await f.open(b);
    const headers = await f.login("clinician");
    const path = `/me/bookings/${b.id}/consultation`;
    const before = await openingCounts(f);
    const response = await f.request(path, { headers });
    assert.equal(response.response.status, 200);
    assert.equal(response.response.headers.get("cache-control"), "no-store");
    const expected = { ...opened, version: 1, closedAt: null };
    assert.deepEqual(response.json.data, expected);
    assert.deepEqual(
      await openingCounts(f),
      before,
      "recovery has no audit/history/command writes",
    );
    const head = await f.request(path, { method: "HEAD", headers });
    assert.equal(head.response.status, 200);
    assert.equal(head.raw, "");
    const closed = await f.consultations.closeConsultation(f.actors.clinician, {
      consultationId: opened.id,
      operationKey: randomUUID(),
      expectedVersion: 1,
    });
    assert.deepEqual((await f.request(path, { headers })).json.data, {
      ...opened,
      ...closed,
    });
    assert.equal(
      (await f.request(path + "?page=1", { headers })).response.status,
      400,
    );
    for (const alias of [
      path + "/",
      path.replace("/consultation", "/Consultation"),
      path.replace("/consultation", "/%63onsultation"),
    ])
      assert.equal((await f.request(alias, { headers })).response.status, 404);
  }));

test("context denies booking-only, other roles, unrelated clinician and ended authority; publication hiding retains current care", () =>
  isolatedConsultations(async (f) => {
    const b = await f.ready({ assignment: false });
    await rejectBooking(
      f.consultations.context(f.actors.clinician, b.id),
      "BOOKING_NOT_FOUND",
    );
    await f.assign();
    await f.open(b);
    const other = await f.otherClinician();
    for (const actor of [
      f.actors.patient,
      f.actors.other,
      f.actors.admin,
      f.actors.lab,
      f.actors.pharmacy,
      other.actor,
    ])
      await rejectBooking(
        f.consultations.context(actor, b.id),
        "BOOKING_NOT_FOUND",
      );
    await f.setProvider({ isPublished: false });
    await f.setClinic({ isPublished: false });
    assert.equal(
      (await f.consultations.context(f.actors.clinician, b.id)).state,
      "OPEN",
    );
    await f.pool.query(
      "UPDATE clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE'",
      [f.users.clinician.profileId, f.users.patient.profileId],
    );
    await rejectBooking(
      f.consultations.context(f.actors.clinician, b.id),
      "BOOKING_NOT_FOUND",
    );
    assert.equal(
      (
        await f.request(`/me/bookings/${b.id}/consultation`, {
          headers: await f.login("clinician"),
        })
      ).response.status,
      404,
    );
  }));

for (const condition of [
  "session",
  "patient",
  "clinic",
  "membership",
  "affiliation",
])
  test(`context rechecks current ${condition} authority`, () =>
    isolatedConsultations(async (f) => {
      const b = await f.ready();
      await f.open(b);
      const revoke = {
        clinic: () =>
          f.store.setOrganizationStatus(f.actors.admin2, {
            organizationId: f.clinicOrg.id,
            status: "SUSPENDED",
            expectedVersion: 0,
          }),
        membership: () =>
          f.store.endMembership(f.actors.admin2, {
            organizationId: f.clinicOrg.id,
            membershipId: f.membership.id,
          }),
        affiliation: () =>
          f.directory.withdrawAffiliation(f.actors.admin2, {
            providerId: f.provider.id,
            publicationId: f.publication.id,
          }),
      };
      const statements = {
        session: [
          "UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1",
          f.actors.clinician.sessionId,
        ],
        patient: [
          "UPDATE users SET status='DISABLED' WHERE id=$1",
          f.users.patient.id,
        ],
      };
      if (revoke[condition]) await revoke[condition]();
      else {
        const [sql, id] = statements[condition];
        await f.pool.query(sql, [id]);
      }
      await rejectBooking(
        f.consultations.context(f.actors.clinician, b.id),
        condition === "session"
          ? "BOOKING_UNAUTHENTICATED"
          : "BOOKING_NOT_FOUND",
      );
    }));

test("context rechecks session expiry after a real PostgreSQL lock wait", () =>
  isolatedConsultations(async (f) => {
    const { waitBlockedBy } = await import(
      "../support/observed-applicability.mjs"
    );
    const b = await f.ready();
    await f.open(b);
    const before = await openingCounts(f),
      blocker = await f.pool.connect();
    let pending;
    try {
      await f.pool.query(
        "UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",
        [f.actors.clinician.sessionId],
      );
      await blocker.query("BEGIN");
      const pid = (await blocker.query("SELECT pg_backend_pid() pid")).rows[0]
        .pid;
      await blocker.query("SELECT id FROM sessions WHERE id=$1 FOR UPDATE", [
        f.actors.clinician.sessionId,
      ]);
      pending = f.consultations.context(f.actors.clinician, b.id);
      pending.catch(() => {});
      await waitBlockedBy(f.pool, pid);
      await f.pool.query("SELECT pg_sleep(2.1)");
      await blocker.query("ROLLBACK");
      await rejectBooking(pending, "BOOKING_UNAUTHENTICATED");
      assert.deepEqual(await openingCounts(f), before);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
      await Promise.allSettled([pending]);
    }
  }));

test("context cannot return pre-revocation authority after waiting for assignment ending", () =>
  isolatedConsultations(async (f) => {
    const { waitBlockedBy } = await import(
      "../support/observed-applicability.mjs"
    );
    const b = await f.ready();
    await f.open(b);
    const before = await openingCounts(f),
      blocker = await f.pool.connect();
    let pending;
    try {
      await blocker.query("BEGIN");
      const pid = (await blocker.query("SELECT pg_backend_pid() pid")).rows[0]
        .pid;
      await blocker.query(
        "UPDATE clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE'",
        [f.users.clinician.profileId, f.users.patient.profileId],
      );
      pending = f.consultations.context(f.actors.clinician, b.id);
      pending.catch(() => {});
      await waitBlockedBy(f.pool, pid);
      await blocker.query("COMMIT");
      await rejectBooking(pending, "BOOKING_NOT_FOUND");
      assert.deepEqual(await openingCounts(f), before);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
      await Promise.allSettled([pending]);
    }
  }));
