-- Slice 7: explicit close only. All nineteen historical migration bytes remain unchanged.
-- Opening provenance stays immutable; close adds one server-owned terminal fact.
ALTER TABLE public.consultations
 ADD COLUMN version integer NOT NULL DEFAULT 1,
 ADD COLUMN closed_at timestamptz(3),
 ADD COLUMN closed_by_user_id uuid,
 ADD COLUMN close_assignment_id uuid,
 ADD COLUMN close_operation_key uuid,
 ADD COLUMN close_command varchar(16);
ALTER TABLE public.consultations DROP CONSTRAINT consultations_state_check;
ALTER TABLE public.consultations ADD CONSTRAINT consultations_state_check CHECK(state IN ('OPEN','CLOSED'));
ALTER TABLE public.consultations ADD CONSTRAINT consultation_close_lifecycle CHECK(
 (state='OPEN' AND version=1 AND closed_at IS NULL AND closed_by_user_id IS NULL AND close_assignment_id IS NULL AND close_operation_key IS NULL AND close_command IS NULL) OR
 (state='CLOSED' AND version=2 AND closed_at IS NOT NULL AND closed_at>=opened_at AND closed_by_user_id IS NOT NULL AND closed_by_user_id=treating_clinician_user_id AND close_assignment_id IS NOT NULL AND close_operation_key IS NOT NULL AND close_command IS NOT DISTINCT FROM 'CLOSE'));
ALTER TABLE public.consultations ADD CONSTRAINT consultation_close_operation_fk FOREIGN KEY(closed_by_user_id,close_command,close_operation_key) REFERENCES public.booking_operations(actor_user_id,command,operation_key) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.consultations ADD CONSTRAINT consultation_close_assignment_fk FOREIGN KEY(close_assignment_id,treating_clinician_id,patient_id) REFERENCES public.clinician_patient_assignments(id,clinician_id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE public.bookings DROP CONSTRAINT booking_bounds;
ALTER TABLE public.bookings ADD CONSTRAINT booking_bounds CHECK(start_at<end_at AND version>0 AND slot_configuration_version>0 AND admission_configuration_version>0 AND state IN ('BOOKED','CANCELLED','RESCHEDULED','NO_SHOW','IN_CONSULTATION','CONSULTED'));
ALTER TABLE public.booking_operations DROP CONSTRAINT booking_operations_command_check, DROP CONSTRAINT booking_operations_check;
ALTER TABLE public.booking_operations ADD CONSTRAINT booking_operations_command_check CHECK(command IN ('CREATE','CANCEL','RESCHEDULE','ATTEND','CORRECT','OPEN','CLOSE'));
ALTER TABLE public.booking_operations ADD CONSTRAINT booking_operations_check CHECK(jsonb_typeof(result)='object' AND CASE WHEN command IN ('OPEN','CLOSE') THEN result->>'bookingId'=booking_id::text ELSE result->>'id'=booking_id::text END);
ALTER TABLE public.booking_events DROP CONSTRAINT booking_event_transition;
ALTER TABLE public.booking_events ADD CONSTRAINT booking_event_transition CHECK(
 (version=1 AND from_state IS NULL AND to_state='BOOKED' AND command IN ('CREATE','RESCHEDULE')) OR
 (version>1 AND from_state='BOOKED' AND ((to_state='CANCELLED' AND command='CANCEL') OR (to_state='RESCHEDULED' AND command='RESCHEDULE') OR (to_state IN ('BOOKED','NO_SHOW') AND command IN ('ATTEND','CORRECT')) OR (to_state='IN_CONSULTATION' AND command='OPEN'))) OR
 (version>1 AND from_state='NO_SHOW' AND to_state='NO_SHOW' AND command='CORRECT') OR
 (version>1 AND from_state='IN_CONSULTATION' AND to_state='CONSULTED' AND command='CLOSE'));

DROP TRIGGER consultation_immutable ON public.consultations;
CREATE TRIGGER consultation_immutable BEFORE DELETE OR TRUNCATE ON public.consultations FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE FUNCTION public.i2_consultation_close_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'OPEN' OR NEW.version<>1 OR NEW.closed_at IS NOT NULL OR NEW.closed_by_user_id IS NOT NULL OR NEW.close_assignment_id IS NOT NULL OR NEW.close_operation_key IS NOT NULL OR NEW.close_command IS NOT NULL THEN RAISE EXCEPTION 'Invalid consultation lifecycle' USING ERRCODE='23514'; END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['state','version','closed_at','closed_by_user_id','close_assignment_id','close_operation_key','close_command']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version','closed_at','closed_by_user_id','close_assignment_id','close_operation_key','close_command']) OR OLD.state<>'OPEN' OR OLD.version<>1 OR NEW.state<>'CLOSED' OR NEW.version<>2 OR NEW.closed_by_user_id IS DISTINCT FROM OLD.treating_clinician_user_id OR NEW.close_command IS DISTINCT FROM 'CLOSE' OR NEW.close_operation_key IS NULL OR NEW.close_assignment_id IS NULL THEN RAISE EXCEPTION 'Immutable consultation provenance' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.bookings WHERE id=OLD.booking_id AND state='CONSULTED') OR NOT EXISTS(SELECT 1 FROM public.clinician_patient_assignments WHERE id=NEW.close_assignment_id AND clinician_id=OLD.treating_clinician_id AND patient_id=OLD.patient_id AND status='ACTIVE' AND ended_at IS NULL) THEN RAISE EXCEPTION 'Invalid consultation close' USING ERRCODE='23514'; END IF;
  NEW.closed_at:=pg_catalog.clock_timestamp()::timestamptz(3);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER consultation_close_guard BEFORE INSERT OR UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.i2_consultation_close_guard();

-- Retained CLOSE event/operation/audit and both terminal states must commit together.
CREATE FUNCTION public.i2_consultation_close_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE c public.consultations; b public.bookings;
BEGIN
 IF TG_TABLE_NAME='consultations' THEN SELECT * INTO c FROM public.consultations WHERE id=NEW.id;
 ELSIF TG_TABLE_NAME='bookings' THEN SELECT * INTO c FROM public.consultations WHERE booking_id=NEW.id;
 ELSE SELECT * INTO c FROM public.consultations WHERE booking_id=NEW.booking_id;
  IF c.id IS NULL OR c.state<>'CLOSED' OR NEW.actor_user_id<>c.closed_by_user_id OR NEW.operation_key<>c.close_operation_key THEN RAISE EXCEPTION 'Orphan close operation' USING ERRCODE='23514'; END IF;
 END IF;
 IF c.id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=c.booking_id;
 IF (c.state='OPEN' AND b.state<>'IN_CONSULTATION') OR (c.state='CLOSED' AND b.state<>'CONSULTED') THEN RAISE EXCEPTION 'Incomplete close state' USING ERRCODE='23514'; END IF;
 IF c.state='CLOSED' AND NOT EXISTS(
  SELECT 1 FROM public.booking_events ev JOIN public.booking_operations op ON op.actor_user_id=ev.actor_user_id AND op.command=ev.command AND op.operation_key=ev.operation_key AND op.booking_id=ev.booking_id
  WHERE ev.booking_id=b.id AND ev.version=b.version AND ev.command='CLOSE' AND ev.from_state='IN_CONSULTATION' AND ev.to_state='CONSULTED' AND ev.actor_user_id=c.closed_by_user_id AND ev.operation_key=c.close_operation_key
   AND op.result->>'id'=c.id::text AND op.result->>'encounterId'=c.encounter_id::text AND op.result->>'bookingId'=b.id::text AND op.result->>'state'='CLOSED' AND op.result->>'bookingState'='CONSULTED' AND op.result->>'version'='2'
   AND op.result->>'closedAt'=to_char(c.closed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
   AND op.xmin::text::bigint=(pg_catalog.pg_current_xact_id()::text::bigint % 4294967296)
 ) THEN RAISE EXCEPTION 'Missing close history' USING ERRCODE='23514'; END IF;
 IF c.state='CLOSED' AND NOT EXISTS(SELECT 1 FROM public.audit_logs a WHERE a.actor_user_id=c.closed_by_user_id AND a.action_type='CONSULTATION_CLOSED' AND a.entity_type='consultation' AND a.entity_id=c.id AND a.safe_metadata='{}'::jsonb AND a.xmin::text::bigint=(pg_catalog.pg_current_xact_id()::text::bigint % 4294967296)) THEN RAISE EXCEPTION 'Missing close audit' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER consultation_close_complete AFTER INSERT OR UPDATE ON public.consultations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_consultation_close_complete();
CREATE CONSTRAINT TRIGGER booking_close_complete AFTER INSERT OR UPDATE ON public.bookings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_consultation_close_complete();
CREATE CONSTRAINT TRIGGER close_operation_complete AFTER INSERT ON public.booking_operations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.command='CLOSE') EXECUTE FUNCTION public.i2_consultation_close_complete();

-- Extend only the three existing lifecycle guards; legacy branches are retained.
CREATE OR REPLACE FUNCTION public.i2_booking_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE s public.availability_slots; p public.bookings;
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT * INTO s FROM public.availability_slots WHERE id=NEW.slot_id FOR SHARE;
  IF NOT FOUND OR s.state<>'PUBLISHED' OR ROW(NEW.clinician_id,NEW.clinician_user_id,NEW.organization_id,NEW.start_at,NEW.end_at,NEW.time_zone,NEW.slot_configuration_version) IS DISTINCT FROM ROW(s.clinician_id,s.clinician_user_id,s.organization_id,s.start_at,s.end_at,s.time_zone,s.configuration_version) OR NEW.state<>'BOOKED' OR NEW.version<>1 OR NEW.created_by_user_id NOT IN(NEW.patient_user_id,NEW.clinician_user_id) THEN RAISE EXCEPTION 'Invalid booking identity' USING ERRCODE='23514'; END IF;
  IF NEW.predecessor_id IS NOT NULL THEN
   SELECT * INTO p FROM public.bookings WHERE id=NEW.predecessor_id;
   IF NOT FOUND OR p.state<>'RESCHEDULED' OR ROW(p.patient_id,p.patient_user_id,p.clinician_id,p.clinician_user_id,p.organization_id) IS DISTINCT FROM ROW(NEW.patient_id,NEW.patient_user_id,NEW.clinician_id,NEW.clinician_user_id,NEW.organization_id) OR p.slot_id=NEW.slot_id THEN RAISE EXCEPTION 'Invalid replacement' USING ERRCODE='23514'; END IF;
  END IF;
  NEW.created_at:=clock_timestamp();
 ELSE
  IF (to_jsonb(NEW)-ARRAY['state','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version']) OR NEW.version<>OLD.version+1 OR NOT(OLD.state='BOOKED' OR (OLD.state='NO_SHOW' AND NEW.state='NO_SHOW') OR (OLD.state='IN_CONSULTATION' AND NEW.state='CONSULTED')) THEN RAISE EXCEPTION 'Immutable booking' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
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
 IF b.state IN ('IN_CONSULTATION','CONSULTED') AND NOT EXISTS(SELECT 1 FROM public.consultations c WHERE c.booking_id=b.id) THEN RAISE EXCEPTION 'Incomplete opening' USING ERRCODE='23514'; END IF;
 IF b.state NOT IN ('IN_CONSULTATION','CONSULTED') AND EXISTS(SELECT 1 FROM public.consultations c WHERE c.booking_id=b.id) THEN RAISE EXCEPTION 'Invalid opening state' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='booking_events' THEN
 IF NEW.command='OPEN' AND (NEW.actor_user_id<>b.clinician_user_id OR NOT EXISTS(SELECT 1 FROM public.booking_attendance WHERE booking_id=b.id AND observation='ATTENDED') OR EXISTS(SELECT 1 FROM public.booking_attendance WHERE booking_id=b.id AND observation='NO_SHOW' AND version=(SELECT max(version) FROM public.booking_attendance WHERE booking_id=b.id))) THEN RAISE EXCEPTION 'Invalid opening attendance' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.i2_consultation_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='clinical_encounters' THEN
  IF NEW.purpose='GENERAL_CONSULTATION' AND NOT EXISTS(SELECT 1 FROM public.consultations WHERE encounter_id=NEW.id) THEN RAISE EXCEPTION 'Missing consultation' USING ERRCODE='23514'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.bookings b JOIN public.booking_events ev ON ev.booking_id=b.id AND ev.command='OPEN' JOIN public.booking_operations op ON op.actor_user_id=ev.actor_user_id AND op.command=ev.command AND op.operation_key=ev.operation_key WHERE b.id=NEW.booking_id AND b.state IN ('IN_CONSULTATION','CONSULTED') AND ev.actor_user_id=NEW.opened_by_user_id AND ev.operation_key=NEW.operation_key AND op.result->>'id'=NEW.id::text AND op.result->>'encounterId'=NEW.encounter_id::text AND op.result->>'bookingId'=b.id::text) THEN RAISE EXCEPTION 'Incomplete consultation' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;
