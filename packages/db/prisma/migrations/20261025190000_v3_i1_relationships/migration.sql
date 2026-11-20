BEGIN;

-- CreateEnum
CREATE TYPE "relationship_request_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "relationship_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "patient_user_id" UUID NOT NULL,
    "clinician_id" UUID NOT NULL,
    "clinician_user_id" UUID NOT NULL,
    "provider_public_id" UUID,
    "operation_key" UUID NOT NULL,
    "status" "relationship_request_status" NOT NULL DEFAULT 'PENDING',
    "authorized_at" TIMESTAMPTZ(3) NOT NULL,
    "authorized_assignment_id" UUID,
    "assignment_count_at_authorization" INTEGER NOT NULL,
    "assignment_id" UUID,
    "accepted_at" TIMESTAMPTZ(3),
    "accepted_by_user_id" UUID,
    "declined_at" TIMESTAMPTZ(3),
    "declined_by_user_id" UUID,
    "authorization_withdrawn_at" TIMESTAMPTZ(3),
    "withdrawn_by_user_id" UUID,

    CONSTRAINT "relationship_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_end_provenance" (
    "assignment_id" UUID NOT NULL,
    "clinician_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "actor_role" "user_role" NOT NULL,
    "ended_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assignment_end_provenance_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "relationship_requests_assignment_key" ON "relationship_requests"("assignment_id");

-- CreateIndex
CREATE INDEX "relationship_requests_patient_history_idx" ON "relationship_requests"("patient_user_id", "authorized_at", "id");

-- CreateIndex
CREATE INDEX "relationship_requests_clinician_history_idx" ON "relationship_requests"("clinician_user_id", "authorized_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "relationship_requests_operation_key" ON "relationship_requests"("patient_user_id", "operation_key");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_id_user_key" ON "patient_profiles"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_relationship_scope_key" ON "clinician_patient_assignments"("id", "clinician_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "directory_relationship_locator_key" ON "clinician_directory"("public_id", "clinician_id", "clinician_user_id");

-- AddForeignKey
ALTER TABLE "relationship_requests" ADD CONSTRAINT "relationship_requests_patient_fk" FOREIGN KEY ("patient_id", "patient_user_id") REFERENCES "patient_profiles"("id", "user_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "relationship_requests" ADD CONSTRAINT "relationship_requests_clinician_fk" FOREIGN KEY ("clinician_id", "clinician_user_id") REFERENCES "clinician_profiles"("id", "user_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "relationship_requests" ADD CONSTRAINT "relationship_requests_provider_fk" FOREIGN KEY ("provider_public_id", "clinician_id", "clinician_user_id") REFERENCES "clinician_directory"("public_id", "clinician_id", "clinician_user_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "relationship_requests" ADD CONSTRAINT "relationship_requests_assignment_fk" FOREIGN KEY ("assignment_id", "clinician_id", "patient_id") REFERENCES "clinician_patient_assignments"("id", "clinician_id", "patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "relationship_requests" ADD CONSTRAINT "relationship_requests_context_fk" FOREIGN KEY ("authorized_assignment_id", "clinician_id", "patient_id") REFERENCES "clinician_patient_assignments"("id", "clinician_id", "patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "relationship_requests" ADD CONSTRAINT "relationship_requests_acceptor_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "relationship_requests" ADD CONSTRAINT "relationship_requests_decliner_fk" FOREIGN KEY ("declined_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "relationship_requests" ADD CONSTRAINT "relationship_requests_withdrawer_fk" FOREIGN KEY ("withdrawn_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assignment_end_provenance" ADD CONSTRAINT "assignment_end_provenance_assignment_fk" FOREIGN KEY ("assignment_id", "clinician_id", "patient_id") REFERENCES "clinician_patient_assignments"("id", "clinician_id", "patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assignment_end_provenance" ADD CONSTRAINT "assignment_end_provenance_actor_fk" FOREIGN KEY ("actor_user_id", "actor_role") REFERENCES "users"("id", "role") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- No backfill. These are new provenance records, never a second clinical grant.
CREATE UNIQUE INDEX relationship_requests_pending_pair_key ON public.relationship_requests(clinician_id,patient_id) WHERE status='PENDING';
ALTER TABLE public.relationship_requests ADD CONSTRAINT relationship_requests_lifecycle_check CHECK (
 assignment_count_at_authorization>=0 AND (provider_public_id IS NOT NULL OR authorized_assignment_id IS NOT NULL) AND
 ((status='PENDING' AND assignment_id IS NULL AND accepted_at IS NULL AND accepted_by_user_id IS NULL AND declined_at IS NULL AND declined_by_user_id IS NULL AND authorization_withdrawn_at IS NULL AND withdrawn_by_user_id IS NULL)
 OR (status='ACCEPTED' AND assignment_id IS NOT NULL AND accepted_at>=authorized_at AND accepted_by_user_id=clinician_user_id AND declined_at IS NULL AND declined_by_user_id IS NULL
   AND ((authorization_withdrawn_at IS NULL AND withdrawn_by_user_id IS NULL) OR (authorization_withdrawn_at>=accepted_at AND withdrawn_by_user_id=patient_user_id)))
 OR (status='DECLINED' AND assignment_id IS NULL AND accepted_at IS NULL AND accepted_by_user_id IS NULL AND declined_at>=authorized_at AND declined_by_user_id=clinician_user_id AND authorization_withdrawn_at IS NULL AND withdrawn_by_user_id IS NULL)
 OR (status='WITHDRAWN' AND assignment_id IS NULL AND accepted_at IS NULL AND accepted_by_user_id IS NULL AND declined_at IS NULL AND declined_by_user_id IS NULL AND authorization_withdrawn_at>=authorized_at AND withdrawn_by_user_id=patient_user_id))
 -- SQL CHECK accepts UNKNOWN; require the nullable event fields explicitly.
 AND (status<>'ACCEPTED' OR (accepted_at IS NOT NULL AND accepted_by_user_id IS NOT NULL))
 AND (status<>'DECLINED' OR (declined_at IS NOT NULL AND declined_by_user_id IS NOT NULL))
 AND (status<>'WITHDRAWN' OR (authorization_withdrawn_at IS NOT NULL AND withdrawn_by_user_id IS NOT NULL))
 AND ((authorization_withdrawn_at IS NULL)=(withdrawn_by_user_id IS NULL))
);
ALTER TABLE public.assignment_end_provenance ADD CONSTRAINT assignment_end_provenance_role_check CHECK(actor_role IN ('PATIENT','CLINICIAN'));

CREATE FUNCTION public.i1_relationship_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.clinician_patient_assignments%ROWTYPE; n integer;
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.status<>'PENDING' THEN RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='relationship_requests_history_guard',MESSAGE='Relationship history is retained'; END IF;
 ELSE
   IF ROW(NEW.id,NEW.patient_id,NEW.patient_user_id,NEW.clinician_id,NEW.clinician_user_id,NEW.provider_public_id,NEW.operation_key,NEW.authorized_at,NEW.authorized_assignment_id,NEW.assignment_count_at_authorization)
      IS DISTINCT FROM ROW(OLD.id,OLD.patient_id,OLD.patient_user_id,OLD.clinician_id,OLD.clinician_user_id,OLD.provider_public_id,OLD.operation_key,OLD.authorized_at,OLD.authorized_assignment_id,OLD.assignment_count_at_authorization)
   OR (OLD.status IN ('DECLINED','WITHDRAWN') AND NEW IS DISTINCT FROM OLD)
   OR (OLD.status='ACCEPTED' AND (NEW.status<>'ACCEPTED' OR ROW(NEW.assignment_id,NEW.accepted_at,NEW.accepted_by_user_id,NEW.declined_at,NEW.declined_by_user_id) IS DISTINCT FROM ROW(OLD.assignment_id,OLD.accepted_at,OLD.accepted_by_user_id,OLD.declined_at,OLD.declined_by_user_id)))
   OR (OLD.authorization_withdrawn_at IS NOT NULL AND NEW IS DISTINCT FROM OLD)
   THEN RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='relationship_requests_history_guard',MESSAGE='Relationship history is retained'; END IF;
 END IF;
 IF TG_OP='INSERT' THEN
   SELECT count(*) INTO n FROM public.clinician_patient_assignments WHERE clinician_id=NEW.clinician_id AND patient_id=NEW.patient_id;
   IF n<>NEW.assignment_count_at_authorization OR (NEW.authorized_assignment_id IS NULL AND EXISTS(SELECT 1 FROM public.clinician_patient_assignments WHERE clinician_id=NEW.clinician_id AND patient_id=NEW.patient_id AND status='ACTIVE')) THEN
     RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='relationship_requests_context_guard',MESSAGE='Invalid relationship context'; END IF;
   IF NEW.authorized_assignment_id IS NOT NULL THEN
     SELECT * INTO a FROM public.clinician_patient_assignments WHERE id=NEW.authorized_assignment_id AND clinician_id=NEW.clinician_id AND patient_id=NEW.patient_id;
     IF NOT FOUND OR a.status<>'ACTIVE' THEN RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='relationship_requests_context_guard',MESSAGE='Invalid relationship context'; END IF;
   END IF;
 END IF;
 IF NEW.status='ACCEPTED' AND (TG_OP='INSERT' OR OLD.status='PENDING') THEN
   SELECT * INTO a FROM public.clinician_patient_assignments WHERE id=NEW.assignment_id AND clinician_id=NEW.clinician_id AND patient_id=NEW.patient_id;
   SELECT count(*) INTO n FROM public.clinician_patient_assignments WHERE clinician_id=NEW.clinician_id AND patient_id=NEW.patient_id;
   IF NOT FOUND OR a.id IS NULL OR a.status<>'ACTIVE' OR
     (NEW.authorized_assignment_id IS NOT NULL AND (NEW.assignment_id<>NEW.authorized_assignment_id OR n<>NEW.assignment_count_at_authorization)) OR
     (NEW.authorized_assignment_id IS NULL AND (n<>NEW.assignment_count_at_authorization+1 OR a.assigned_at<NEW.authorized_at)) THEN
       RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='relationship_requests_context_guard',MESSAGE='Invalid relationship context'; END IF;
 END IF;
 IF NEW.status='ACCEPTED' AND NEW.authorization_withdrawn_at IS NOT NULL AND EXISTS(SELECT 1 FROM public.clinician_patient_assignments WHERE id=NEW.assignment_id AND status='ACTIVE') THEN
   RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='relationship_requests_withdrawal_guard',MESSAGE='Authorization withdrawal requires exact relationship ending'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER relationship_requests_history_guard BEFORE INSERT OR UPDATE ON public.relationship_requests FOR EACH ROW EXECUTE FUNCTION public.i1_relationship_guard();
CREATE TRIGGER relationship_requests_removal_guard BEFORE DELETE OR TRUNCATE ON public.relationship_requests FOR EACH STATEMENT EXECUTE FUNCTION public.i1_reject_removal();

CREATE FUNCTION public.i1_assignment_end_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.clinician_patient_assignments%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.clinician_patient_assignments WHERE id=NEW.assignment_id AND clinician_id=NEW.clinician_id AND patient_id=NEW.patient_id FOR UPDATE;
 IF NOT FOUND OR a.status<>'ACTIVE' OR NEW.ended_at<a.assigned_at OR NOT EXISTS(
   SELECT 1 FROM public.users u WHERE u.id=NEW.actor_user_id AND u.role=NEW.actor_role AND u.status='ACTIVE' AND
   ((NEW.actor_role='PATIENT' AND EXISTS(SELECT 1 FROM public.patient_profiles p WHERE p.id=a.patient_id AND p.user_id=u.id))
    OR (NEW.actor_role='CLINICIAN' AND EXISTS(SELECT 1 FROM public.clinician_profiles c WHERE c.id=a.clinician_id AND c.user_id=u.id))))
 THEN RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='assignment_end_provenance_participant_guard',MESSAGE='Invalid relationship ending'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assignment_end_provenance_participant_guard BEFORE INSERT ON public.assignment_end_provenance FOR EACH ROW EXECUTE FUNCTION public.i1_assignment_end_guard();
CREATE TRIGGER assignment_end_provenance_history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.assignment_end_provenance FOR EACH STATEMENT EXECUTE FUNCTION public.i1_reject_removal();
CREATE FUNCTION public.i1_assignment_end_commit_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.clinician_patient_assignments WHERE id=NEW.assignment_id AND status='ENDED' AND ended_at=NEW.ended_at) THEN
   RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='assignment_end_provenance_commit_guard',MESSAGE='Invalid relationship ending'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER assignment_end_provenance_commit_guard AFTER INSERT ON public.assignment_end_provenance DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i1_assignment_end_commit_guard();

ALTER TABLE public.relationship_requests ADD CONSTRAINT relationship_requests_timestamps_check CHECK(isfinite(authorized_at) AND (accepted_at IS NULL OR isfinite(accepted_at)) AND (declined_at IS NULL OR isfinite(declined_at)) AND (authorization_withdrawn_at IS NULL OR isfinite(authorization_withdrawn_at)));
ALTER TABLE public.assignment_end_provenance ADD CONSTRAINT assignment_end_provenance_timestamp_check CHECK(isfinite(ended_at));
COMMIT;
