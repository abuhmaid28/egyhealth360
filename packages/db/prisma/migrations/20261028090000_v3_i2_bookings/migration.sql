-- Slice 3 logistics only; fifteen historical migrations are unchanged. No backfill.
CREATE TABLE public.bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 patient_id uuid NOT NULL, patient_user_id uuid NOT NULL,
 clinician_id uuid NOT NULL, clinician_user_id uuid NOT NULL,
 organization_id uuid NOT NULL, slot_id uuid NOT NULL REFERENCES public.availability_slots(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 start_at timestamptz(3) NOT NULL, end_at timestamptz(3) NOT NULL, time_zone varchar(100) NOT NULL,
 slot_configuration_version integer NOT NULL, admission_configuration_version integer NOT NULL,
 created_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 predecessor_id uuid UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 state varchar(16) NOT NULL DEFAULT 'BOOKED', version integer NOT NULL DEFAULT 1,
 FOREIGN KEY(patient_id,patient_user_id) REFERENCES public.patient_profiles(id,user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(clinician_id,clinician_user_id) REFERENCES public.clinician_profiles(id,user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(organization_id,admission_configuration_version) REFERENCES public.clinic_scheduling_settings(organization_id,version) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT booking_bounds CHECK(start_at<end_at AND version>0 AND slot_configuration_version>0 AND admission_configuration_version>0 AND state IN ('BOOKED','CANCELLED','RESCHEDULED','NO_SHOW')),
 CONSTRAINT booking_patient_overlap EXCLUDE USING gist(patient_id WITH =,tstzrange(start_at,end_at,'[)') WITH &&) WHERE(state='BOOKED'),
 CONSTRAINT booking_clinician_overlap EXCLUDE USING gist(clinician_id WITH =,tstzrange(start_at,end_at,'[)') WITH &&) WHERE(state='BOOKED')
);
CREATE UNIQUE INDEX booking_slot_capacity ON public.bookings(slot_id) WHERE state='BOOKED';
CREATE INDEX booking_patient_history ON public.bookings(patient_user_id,start_at DESC,id);
CREATE INDEX booking_clinician_history ON public.bookings(clinician_user_id,start_at DESC,id);
CREATE TABLE public.booking_operations (
 actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 command varchar(16) NOT NULL CHECK(command IN ('CREATE','CANCEL','RESCHEDULE','ATTEND','CORRECT')),
 operation_key uuid NOT NULL CHECK(operation_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
 fingerprint varchar(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object' AND result->>'id'=booking_id::text),
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,command,operation_key)
);
CREATE TABLE public.booking_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 version integer NOT NULL CHECK(version>0), command varchar(16) NOT NULL,
 from_state varchar(16), to_state varchar(16) NOT NULL,
 actor_user_id uuid NOT NULL, operation_key uuid NOT NULL,
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(booking_id,version),
 FOREIGN KEY(actor_user_id,command,operation_key) REFERENCES public.booking_operations(actor_user_id,command,operation_key) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 CONSTRAINT booking_event_transition CHECK(
 (version=1 AND from_state IS NULL AND to_state='BOOKED' AND command IN ('CREATE','RESCHEDULE')) OR
 (version>1 AND from_state='BOOKED' AND ((to_state='CANCELLED' AND command='CANCEL') OR (to_state='RESCHEDULED' AND command='RESCHEDULE') OR (to_state IN ('BOOKED','NO_SHOW') AND command IN ('ATTEND','CORRECT')))) OR
 (version>1 AND from_state='NO_SHOW' AND to_state='NO_SHOW' AND command='CORRECT'))
);
CREATE TABLE public.booking_attendance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL, version integer NOT NULL,
 observation varchar(16) NOT NULL CHECK(observation IN ('ATTENDED','NO_SHOW')),
 supersedes_id uuid UNIQUE REFERENCES public.booking_attendance(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 reason varchar(4000), actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(booking_id,version),
 FOREIGN KEY(booking_id,version) REFERENCES public.booking_events(booking_id,version) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 CHECK((supersedes_id IS NULL AND reason IS NULL) OR (supersedes_id IS NOT NULL AND reason IS NOT NULL AND length(btrim(reason))>0 AND char_length(reason) BETWEEN 1 AND 1000 AND reason !~ '[[:cntrl:]]'))
);
CREATE FUNCTION public.i2_booking_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
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
  IF (to_jsonb(NEW)-ARRAY['state','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version']) OR NEW.version<>OLD.version+1 OR NOT(OLD.state='BOOKED' OR (OLD.state='NO_SHOW' AND NEW.state='NO_SHOW')) THEN RAISE EXCEPTION 'Immutable booking' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_guard BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.i2_booking_guard();
CREATE TRIGGER booking_removal BEFORE DELETE OR TRUNCATE ON public.bookings FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TRIGGER booking_event_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.booking_events FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TRIGGER booking_operation_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.booking_operations FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TRIGGER booking_attendance_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.booking_attendance FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE FUNCTION public.i2_booking_history_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
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
  IF e.command NOT IN ('ATTEND','CORRECT') OR a.actor_user_id<>e.actor_user_id OR a.actor_user_id<>b.clinician_user_id OR (a.observation='NO_SHOW' AND e.to_state<>'NO_SHOW') OR (a.observation='ATTENDED' AND a.recorded_at<b.start_at) OR (a.observation='NO_SHOW' AND a.recorded_at<b.end_at) THEN RAISE EXCEPTION 'Invalid attendance' USING ERRCODE='23514'; END IF;
  SELECT * INTO prior FROM public.booking_attendance WHERE booking_id=b.id AND version<a.version ORDER BY version DESC LIMIT 1;
  IF (e.command='ATTEND' AND (prior.id IS NOT NULL OR a.supersedes_id IS NOT NULL)) OR (e.command='CORRECT' AND (prior.id IS NULL OR a.supersedes_id IS DISTINCT FROM prior.id)) THEN RAISE EXCEPTION 'Invalid observation lineage' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER booking_complete AFTER INSERT OR UPDATE ON public.bookings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_booking_history_guard();
CREATE CONSTRAINT TRIGGER booking_event_complete AFTER INSERT ON public.booking_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_booking_history_guard();
CREATE CONSTRAINT TRIGGER booking_attendance_complete AFTER INSERT ON public.booking_attendance DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_booking_history_guard();
-- DB receipt times cannot be injected by ordinary INSERT callers.
CREATE FUNCTION public.i2_booking_receipt() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$ BEGIN NEW.recorded_at:=clock_timestamp(); RETURN NEW; END $$;
CREATE TRIGGER booking_event_receipt BEFORE INSERT ON public.booking_events FOR EACH ROW EXECUTE FUNCTION public.i2_booking_receipt();
CREATE TRIGGER booking_operation_receipt BEFORE INSERT ON public.booking_operations FOR EACH ROW EXECUTE FUNCTION public.i2_booking_receipt();
CREATE TRIGGER booking_attendance_receipt BEFORE INSERT ON public.booking_attendance FOR EACH ROW EXECUTE FUNCTION public.i2_booking_receipt();
-- An occupied published slot cannot be withdrawn, including by direct SQL.
CREATE FUNCTION public.i2_occupied_slot_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$ BEGIN
 IF NEW.state='WITHDRAWN' AND EXISTS(SELECT 1 FROM public.bookings WHERE slot_id=NEW.id AND state='BOOKED') THEN RAISE EXCEPTION 'Occupied availability' USING ERRCODE='23P01'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER availability_occupied BEFORE UPDATE ON public.availability_slots FOR EACH ROW EXECUTE FUNCTION public.i2_occupied_slot_guard();
