-- Slice 4 opening only. All sixteen historical migrations remain byte-identical.
-- No backfill; every new consultation must originate in a new explicit command.
ALTER TABLE public.clinical_encounters DROP CONSTRAINT clinical_encounters_purpose_check;
ALTER TABLE public.clinical_encounters ADD CONSTRAINT clinical_encounters_purpose_check CHECK(purpose IN ('HTN_BP_FOLLOWUP','GENERAL_CONSULTATION'));
ALTER TABLE public.bookings DROP CONSTRAINT booking_bounds;
ALTER TABLE public.bookings ADD CONSTRAINT booking_bounds CHECK(start_at<end_at AND version>0 AND slot_configuration_version>0 AND admission_configuration_version>0 AND state IN ('BOOKED','CANCELLED','RESCHEDULED','NO_SHOW','IN_CONSULTATION'));
ALTER TABLE public.bookings ADD CONSTRAINT booking_consultation_scope UNIQUE(id,patient_id,patient_user_id,clinician_id,clinician_user_id,organization_id,slot_id);
ALTER TABLE public.bookings DROP CONSTRAINT booking_patient_overlap, DROP CONSTRAINT booking_clinician_overlap;
ALTER TABLE public.bookings ADD CONSTRAINT booking_patient_overlap EXCLUDE USING gist(patient_id WITH =,tstzrange(start_at,end_at,'[)') WITH &&) WHERE(state IN ('BOOKED','IN_CONSULTATION'));
ALTER TABLE public.bookings ADD CONSTRAINT booking_clinician_overlap EXCLUDE USING gist(clinician_id WITH =,tstzrange(start_at,end_at,'[)') WITH &&) WHERE(state IN ('BOOKED','IN_CONSULTATION'));
DROP INDEX public.booking_slot_capacity;
CREATE UNIQUE INDEX booking_slot_capacity ON public.bookings(slot_id) WHERE state IN ('BOOKED','IN_CONSULTATION');
ALTER TABLE public.booking_operations DROP CONSTRAINT booking_operations_command_check, DROP CONSTRAINT booking_operations_check;
ALTER TABLE public.booking_operations ADD CHECK(command IN ('CREATE','CANCEL','RESCHEDULE','ATTEND','CORRECT','OPEN'));
ALTER TABLE public.booking_operations ADD CHECK(jsonb_typeof(result)='object' AND CASE WHEN command='OPEN' THEN result->>'bookingId'=booking_id::text ELSE result->>'id'=booking_id::text END);
ALTER TABLE public.booking_events DROP CONSTRAINT booking_event_transition;
ALTER TABLE public.booking_events ADD CONSTRAINT booking_event_transition CHECK(
 (version=1 AND from_state IS NULL AND to_state='BOOKED' AND command IN ('CREATE','RESCHEDULE')) OR
 (version>1 AND from_state='BOOKED' AND ((to_state='CANCELLED' AND command='CANCEL') OR (to_state='RESCHEDULED' AND command='RESCHEDULE') OR (to_state IN ('BOOKED','NO_SHOW') AND command IN ('ATTEND','CORRECT')) OR (to_state='IN_CONSULTATION' AND command='OPEN'))) OR
 (version>1 AND from_state='NO_SHOW' AND to_state='NO_SHOW' AND command='CORRECT'));
CREATE TABLE public.consultations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 encounter_id uuid NOT NULL UNIQUE,
 booking_id uuid NOT NULL UNIQUE,
 patient_id uuid NOT NULL, patient_user_id uuid NOT NULL,
 booked_clinician_id uuid NOT NULL, booked_clinician_user_id uuid NOT NULL,
 treating_clinician_id uuid NOT NULL, treating_clinician_user_id uuid NOT NULL,
 opened_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 organization_id uuid NOT NULL, slot_id uuid NOT NULL,
 provider_id uuid NOT NULL REFERENCES public.clinician_directory(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 membership_id uuid NOT NULL REFERENCES public.organization_memberships(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 affiliation_id uuid NOT NULL REFERENCES public.directory_affiliations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 assignment_id uuid NOT NULL,
 scheduled_start_at timestamptz(3) NOT NULL, scheduled_end_at timestamptz(3) NOT NULL,
 time_zone varchar(100) NOT NULL,
 opened_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 state varchar(16) NOT NULL DEFAULT 'OPEN' CHECK(state='OPEN'),
 operation_key uuid NOT NULL,
 command varchar(16) NOT NULL DEFAULT 'OPEN' CHECK(command='OPEN'),
 FOREIGN KEY(booking_id,patient_id,patient_user_id,booked_clinician_id,booked_clinician_user_id,organization_id,slot_id) REFERENCES public.bookings(id,patient_id,patient_user_id,clinician_id,clinician_user_id,organization_id,slot_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(encounter_id,patient_id) REFERENCES public.clinical_encounters(id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(assignment_id,treating_clinician_id,patient_id) REFERENCES public.clinician_patient_assignments(id,clinician_id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(treating_clinician_id,treating_clinician_user_id) REFERENCES public.clinician_profiles(id,user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(opened_by_user_id,command,operation_key) REFERENCES public.booking_operations(actor_user_id,command,operation_key) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 CHECK(treating_clinician_id=booked_clinician_id AND treating_clinician_user_id=booked_clinician_user_id AND opened_by_user_id=treating_clinician_user_id AND scheduled_start_at<scheduled_end_at AND opened_at>=scheduled_start_at)
);
CREATE TRIGGER consultation_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.consultations FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
-- New general encounters never call the nested legacy clinical lock helper.
-- The HTN branch is unchanged; the opening service already owns the canonical prefix.
CREATE OR REPLACE FUNCTION public.eh012_guard_encounter_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NEW.purpose='HTN_BP_FOLLOWUP' THEN
  PERFORM public.eh012_lock_clinician(NEW.recorded_by_user_id,NEW.patient_id);
  NEW.created_at:=pg_catalog.clock_timestamp()::timestamptz(3);
 ELSE
  NEW.created_at:=pg_catalog.clock_timestamp()::timestamptz(3);
  NEW.occurred_at:=NEW.created_at;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.i2_consultation_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE b public.bookings; s public.availability_slots; e public.clinical_encounters;
BEGIN
 SELECT * INTO b FROM public.bookings WHERE id=NEW.booking_id;
 SELECT * INTO s FROM public.availability_slots WHERE id=b.slot_id;
 SELECT * INTO e FROM public.clinical_encounters WHERE id=NEW.encounter_id;
 IF b.id IS NULL OR b.state<>'IN_CONSULTATION' OR e.purpose<>'GENERAL_CONSULTATION' OR e.recorded_by_user_id<>NEW.opened_by_user_id OR ROW(NEW.provider_id,NEW.membership_id,NEW.affiliation_id,NEW.scheduled_start_at,NEW.scheduled_end_at,NEW.time_zone) IS DISTINCT FROM ROW(s.provider_id,s.membership_id,s.affiliation_id,b.start_at,b.end_at,b.time_zone) OR NOT EXISTS(SELECT 1 FROM public.clinician_patient_assignments WHERE id=NEW.assignment_id AND clinician_id=b.clinician_id AND patient_id=b.patient_id AND status='ACTIVE' AND ended_at IS NULL) THEN RAISE EXCEPTION 'Invalid consultation provenance' USING ERRCODE='23514'; END IF;
 NEW.opened_at:=e.created_at;
 RETURN NEW;
END $$;
CREATE TRIGGER consultation_insert BEFORE INSERT ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.i2_consultation_insert();
CREATE FUNCTION public.i2_consultation_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='clinical_encounters' THEN
  IF NEW.purpose='GENERAL_CONSULTATION' AND NOT EXISTS(SELECT 1 FROM public.consultations WHERE encounter_id=NEW.id) THEN RAISE EXCEPTION 'Missing consultation' USING ERRCODE='23514'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.bookings b JOIN public.booking_events ev ON ev.booking_id=b.id AND ev.version=b.version AND ev.command='OPEN' JOIN public.booking_operations op ON op.actor_user_id=ev.actor_user_id AND op.command=ev.command AND op.operation_key=ev.operation_key WHERE b.id=NEW.booking_id AND b.state='IN_CONSULTATION' AND ev.actor_user_id=NEW.opened_by_user_id AND ev.operation_key=NEW.operation_key AND op.result->>'id'=NEW.id::text AND op.result->>'encounterId'=NEW.encounter_id::text AND op.result->>'bookingId'=b.id::text) THEN RAISE EXCEPTION 'Incomplete consultation' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER general_encounter_complete AFTER INSERT ON public.clinical_encounters DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_consultation_complete();
CREATE CONSTRAINT TRIGGER consultation_complete AFTER INSERT ON public.consultations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_consultation_complete();
-- Legacy BP association API remains HTN-only, including ordinary direct SQL.
CREATE FUNCTION public.i2_legacy_bp_purpose() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.clinical_encounters WHERE id=NEW.encounter_id AND purpose='HTN_BP_FOLLOWUP') THEN RAISE EXCEPTION 'Invalid legacy encounter' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_legacy_bp_purpose BEFORE INSERT ON public.encounter_bp_associations FOR EACH ROW EXECUTE FUNCTION public.i2_legacy_bp_purpose();
CREATE OR REPLACE FUNCTION public.i2_booking_history_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE b public.bookings; e public.booking_events; a public.booking_attendance; prior public.booking_attendance;
BEGIN
 IF TG_TABLE_NAME='bookings' THEN SELECT * INTO b FROM public.bookings WHERE id=NEW.id;
 ELSE SELECT * INTO b FROM public.bookings WHERE id=NEW.booking_id; END IF;
 SELECT * INTO e FROM public.booking_events WHERE booking_id=b.id ORDER BY version DESC LIMIT 1;
 IF e.id IS NULL OR e.version<>b.version OR e.to_state<>b.state OR (SELECT count(*) FROM public.booking_events WHERE booking_id=b.id)<>b.version THEN RAISE EXCEPTION 'Incomplete booking history' USING ERRCODE='23514'; END IF;
 IF b.state='RESCHEDULED' AND NOT EXISTS(SELECT 1 FROM public.bookings WHERE predecessor_id=b.id) THEN RAISE EXCEPTION 'Missing replacement' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='booking_events' THEN
  SELECT * INTO e FROM public.booking_events WHERE id=NEW.id;
  IF e.actor_user_id NOT IN(b.patient_user_id,b.clinician_user_id) OR (e.command='CREATE' AND e.actor_user_id<>b.patient_user_id) THEN RAISE EXCEPTION 'Invalid booking actor' USING ERRCODE='23514'; END IF;
  IF e.version>1 AND NOT EXISTS(SELECT 1 FROM public.booking_events x WHERE x.booking_id=e.booking_id AND x.version=e.version-1 AND x.to_state=e.from_state) THEN RAISE EXCEPTION 'Invalid event predecessor' USING ERRCODE='23514'; END IF;
  IF e.command IN ('ATTEND','CORRECT') AND NOT EXISTS(SELECT 1 FROM public.booking_attendance x WHERE x.booking_id=e.booking_id AND x.version=e.version) THEN RAISE EXCEPTION 'Missing observation' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_TABLE_NAME='booking_attendance' THEN
  a:=NEW; SELECT * INTO e FROM public.booking_events WHERE booking_id=a.booking_id AND version=a.version;
  IF e.command NOT IN ('ATTEND','CORRECT','OPEN') OR a.actor_user_id<>e.actor_user_id OR a.actor_user_id<>b.clinician_user_id OR (a.observation='NO_SHOW' AND e.to_state<>'NO_SHOW') OR (a.observation='ATTENDED' AND a.recorded_at<b.start_at) OR (a.observation='NO_SHOW' AND a.recorded_at<b.end_at) THEN RAISE EXCEPTION 'Invalid attendance' USING ERRCODE='23514'; END IF;
  SELECT * INTO prior FROM public.booking_attendance WHERE booking_id=b.id AND version<a.version ORDER BY version DESC LIMIT 1;
  IF (e.command IN ('ATTEND','OPEN') AND (prior.id IS NOT NULL OR a.supersedes_id IS NOT NULL)) OR (e.command='CORRECT' AND (prior.id IS NULL OR a.supersedes_id IS DISTINCT FROM prior.id)) THEN RAISE EXCEPTION 'Invalid observation lineage' USING ERRCODE='23514'; END IF;
 END IF;
 IF b.state='IN_CONSULTATION' AND NOT EXISTS(SELECT 1 FROM public.consultations c WHERE c.booking_id=b.id) THEN RAISE EXCEPTION 'Incomplete opening' USING ERRCODE='23514'; END IF;
 IF b.state<>'IN_CONSULTATION' AND EXISTS(SELECT 1 FROM public.consultations c WHERE c.booking_id=b.id) THEN RAISE EXCEPTION 'Invalid opening state' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='booking_events' THEN
 IF NEW.command='OPEN' AND (NEW.actor_user_id<>b.clinician_user_id OR NOT EXISTS(SELECT 1 FROM public.booking_attendance WHERE booking_id=b.id AND observation='ATTENDED') OR EXISTS(SELECT 1 FROM public.booking_attendance WHERE booking_id=b.id AND observation='NO_SHOW' AND version=(SELECT max(version) FROM public.booking_attendance WHERE booking_id=b.id))) THEN RAISE EXCEPTION 'Invalid opening attendance' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.i2_occupied_slot_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$ BEGIN
 IF NEW.state='WITHDRAWN' AND EXISTS(SELECT 1 FROM public.bookings WHERE slot_id=NEW.id AND state IN ('BOOKED','IN_CONSULTATION')) THEN RAISE EXCEPTION 'Occupied availability' USING ERRCODE='23P01'; END IF; RETURN NEW;
END $$;
