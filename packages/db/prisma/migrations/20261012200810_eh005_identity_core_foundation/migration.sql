BEGIN;

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('PATIENT', 'CLINICIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "assignment_status" AS ENUM ('ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "user_role" "user_role" NOT NULL DEFAULT 'PATIENT',
    "display_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "sex" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinician_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "user_role" "user_role" NOT NULL DEFAULT 'CLINICIAN',
    "display_name" TEXT NOT NULL,
    "specialty" TEXT,
    "professional_identifier" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinician_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinician_patient_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinician_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "status" "assignment_status" NOT NULL DEFAULT 'ACTIVE',
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "clinician_patient_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "action_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "safe_metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_role_key" ON "users"("id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_user_role_key" ON "patient_profiles"("user_id", "user_role");

-- CreateIndex
CREATE UNIQUE INDEX "clinician_profiles_user_id_key" ON "clinician_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinician_profiles_user_role_key" ON "clinician_profiles"("user_id", "user_role");

-- CreateIndex
CREATE INDEX "assignments_clinician_history_idx" ON "clinician_patient_assignments"("clinician_id", "status", "assigned_at");

-- CreateIndex
CREATE INDEX "assignments_patient_history_idx" ON "clinician_patient_assignments"("patient_id", "status", "assigned_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_timestamp_idx" ON "audit_logs"("actor_user_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_entity_timestamp_idx" ON "audit_logs"("entity_type", "entity_id", "timestamp");

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_role_fkey" FOREIGN KEY ("user_id", "user_role") REFERENCES "users"("id", "role") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "clinician_profiles" ADD CONSTRAINT "clinician_profiles_user_role_fkey" FOREIGN KEY ("user_id", "user_role") REFERENCES "users"("id", "role") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "clinician_patient_assignments" ADD CONSTRAINT "assignments_clinician_fkey" FOREIGN KEY ("clinician_id") REFERENCES "clinician_profiles"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "clinician_patient_assignments" ADD CONSTRAINT "assignments_patient_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Approved custom contract: Prisma schema does not express these invariants.
ALTER TABLE users ADD CONSTRAINT users_email_canonical_check CHECK (
    email = translate(email, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')
    AND email COLLATE "C" ~ '^[!-~]+$'
);
ALTER TABLE users ADD CONSTRAINT users_email_shape_check CHECK (email ~ '^[^@]+@[^@]+$');
ALTER TABLE users ADD CONSTRAINT users_password_hash_nonblank_check
    CHECK (btrim(password_hash, E' \t\n\r\f\013') <> '');
ALTER TABLE patient_profiles ADD CONSTRAINT patient_profiles_role_check CHECK (user_role = 'PATIENT');
ALTER TABLE clinician_profiles ADD CONSTRAINT clinician_profiles_role_check CHECK (user_role = 'CLINICIAN');
ALTER TABLE clinician_patient_assignments ADD CONSTRAINT assignments_lifecycle_check CHECK (
    (status = 'ACTIVE' AND ended_at IS NULL)
    OR (status = 'ENDED' AND ended_at IS NOT NULL AND ended_at >= assigned_at)
);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_type_nonblank_check
    CHECK (btrim(action_type, E' \t\n\r\f\013') <> '');
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_entity_type_nonblank_check
    CHECK (btrim(entity_type, E' \t\n\r\f\013') <> '');
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_metadata_object_check
    CHECK (jsonb_typeof(safe_metadata) = 'object');

CREATE UNIQUE INDEX clinician_patient_assignments_active_pair_key
    ON clinician_patient_assignments (clinician_id, patient_id) WHERE status = 'ACTIVE';

CREATE FUNCTION guard_assignment_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP IN ('DELETE', 'TRUNCATE') THEN
        RAISE EXCEPTION 'Assignment history cannot be removed'
            USING ERRCODE = '23514', CONSTRAINT = 'assignments_history_guard';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.clinician_id IS DISTINCT FROM OLD.clinician_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
       OR (OLD.status = 'ENDED' AND NEW IS DISTINCT FROM OLD) THEN
        RAISE EXCEPTION 'Assignment history cannot be rewritten'
            USING ERRCODE = '23514', CONSTRAINT = 'assignments_history_guard';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER assignments_history_guard BEFORE UPDATE OR DELETE
    ON clinician_patient_assignments FOR EACH ROW EXECUTE FUNCTION guard_assignment_history();
CREATE TRIGGER assignments_truncate_guard BEFORE TRUNCATE
    ON clinician_patient_assignments FOR EACH STATEMENT EXECUTE FUNCTION guard_assignment_history();

CREATE FUNCTION reject_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are append-only'
        USING ERRCODE = '23514', CONSTRAINT = 'audit_logs_append_only_guard';
END;
$$;

CREATE TRIGGER audit_logs_append_only_guard BEFORE UPDATE OR DELETE OR TRUNCATE
    ON audit_logs FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();

COMMIT;
