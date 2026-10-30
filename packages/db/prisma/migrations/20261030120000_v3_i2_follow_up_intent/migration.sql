-- Slice 6: additive, no backfill. Session authentication is service-owned.
BEGIN;
ALTER TABLE public.consultations ADD CONSTRAINT consultation_intent_scope UNIQUE(id,encounter_id,patient_id,treating_clinician_id,treating_clinician_user_id);
ALTER TABLE public.bookings ADD CONSTRAINT booking_intent_patient UNIQUE(id,patient_id);
CREATE TABLE public.follow_up_intents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), consultation_id uuid NOT NULL, encounter_id uuid NOT NULL, patient_id uuid NOT NULL,
 author_clinician_id uuid NOT NULL, author_user_id uuid NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(id,patient_id), UNIQUE(id,consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id),
 FOREIGN KEY(consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id) REFERENCES public.consultations(id,encounter_id,patient_id,treating_clinician_id,treating_clinician_user_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE TABLE public.follow_up_intent_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid NOT NULL REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 root_id uuid NOT NULL, patient_id uuid NOT NULL,
 command text NOT NULL CHECK(command IN ('DRAFT','RELEASE','CORRECT','LINK','REPLACE','PRIVACY')),
 operation_key uuid NOT NULL CHECK(operation_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
 fingerprint varchar(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 version_limit integer NOT NULL CHECK(version_limit>=0), link_limit integer NOT NULL CHECK(link_limit>=0),
 result_version_id uuid, result_link_id uuid, audit_id uuid NOT NULL UNIQUE REFERENCES public.audit_logs(id) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(actor_user_id,command,operation_key), UNIQUE(id,root_id,patient_id,actor_user_id,command),
 FOREIGN KEY(root_id,patient_id) REFERENCES public.follow_up_intents(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CHECK((command IN ('DRAFT','RELEASE','CORRECT') AND result_version_id IS NOT NULL AND result_link_id IS NULL) OR (command IN ('LINK','REPLACE') AND result_version_id IS NULL AND result_link_id IS NOT NULL) OR (command='PRIVACY' AND result_version_id IS NULL AND result_link_id IS NULL))
);
CREATE TABLE public.follow_up_intent_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), root_id uuid NOT NULL, consultation_id uuid NOT NULL, encounter_id uuid NOT NULL, patient_id uuid NOT NULL,
 author_clinician_id uuid NOT NULL, author_user_id uuid NOT NULL,
 version integer NOT NULL CHECK(version>0), command text NOT NULL CHECK(command IN ('DRAFT','RELEASE','CORRECT')),
 state text NOT NULL CHECK(state IN ('DRAFT','SIGNED_RELEASED')), instruction text NOT NULL CHECK(length(instruction)>=1 AND public.i2_document_text(instruction,2000)),
 desired_start_at timestamptz(6), desired_end_at timestamptz(6), time_zone varchar(100),
 predecessor_id uuid UNIQUE, reason text CHECK(length(reason)>=1 AND public.i2_document_text(reason,1000)),
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), signed_at timestamptz(3), released_at timestamptz(3), operation_id uuid NOT NULL UNIQUE,
 UNIQUE(root_id,version), UNIQUE(id,root_id,patient_id),
 FOREIGN KEY(root_id,consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id) REFERENCES public.follow_up_intents(id,consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(predecessor_id,root_id,patient_id) REFERENCES public.follow_up_intent_versions(id,root_id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(operation_id,root_id,patient_id,author_user_id,command) REFERENCES public.follow_up_intent_operations(id,root_id,patient_id,actor_user_id,command) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 CHECK(((desired_start_at IS NULL AND desired_end_at IS NULL AND time_zone IS NULL) OR (desired_start_at IS NOT NULL AND desired_end_at IS NOT NULL AND time_zone IS NOT NULL AND length(time_zone)>=1 AND desired_start_at<desired_end_at AND isfinite(desired_start_at) AND isfinite(desired_end_at) AND desired_start_at>=TIMESTAMPTZ '0001-01-01Z' AND desired_end_at<TIMESTAMPTZ '10000-01-01Z' AND desired_start_at=date_trunc('milliseconds',desired_start_at) AND desired_end_at=date_trunc('milliseconds',desired_end_at))) IS TRUE),
 CHECK(((version=1 AND command='DRAFT' AND state='DRAFT' AND predecessor_id IS NULL AND signed_at IS NULL AND released_at IS NULL AND reason IS NULL) OR (version>=2 AND command IN ('RELEASE','CORRECT') AND state='SIGNED_RELEASED' AND predecessor_id IS NOT NULL AND signed_at IS NOT NULL AND released_at IS NOT NULL AND signed_at=created_at AND released_at=signed_at AND ((version=2 AND command='RELEASE' AND reason IS NULL) OR (version>2 AND command='CORRECT' AND reason IS NOT NULL)))) IS TRUE)
);
CREATE TABLE public.follow_up_intent_booking_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), root_id uuid NOT NULL, patient_id uuid NOT NULL, booking_id uuid NOT NULL,
 sequence integer NOT NULL CHECK(sequence>0), predecessor_id uuid UNIQUE, actor_user_id uuid NOT NULL,
 command text NOT NULL CHECK(command IN ('LINK','REPLACE')), operation_id uuid NOT NULL UNIQUE,
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(root_id,sequence), UNIQUE(id,root_id,patient_id),
 FOREIGN KEY(root_id,patient_id) REFERENCES public.follow_up_intents(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(booking_id,patient_id) REFERENCES public.bookings(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(predecessor_id,root_id,patient_id) REFERENCES public.follow_up_intent_booking_links(id,root_id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(operation_id,root_id,patient_id,actor_user_id,command) REFERENCES public.follow_up_intent_operations(id,root_id,patient_id,actor_user_id,command) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 CHECK((sequence=1 AND command='LINK' AND predecessor_id IS NULL) OR (sequence>1 AND command='REPLACE' AND predecessor_id IS NOT NULL))
);
CREATE TABLE public.follow_up_intent_privacy_restrictions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), root_id uuid NOT NULL, patient_id uuid NOT NULL, version_id uuid NOT NULL UNIQUE,
 actor_user_id uuid NOT NULL, operation_id uuid NOT NULL, command text NOT NULL DEFAULT 'PRIVACY' CHECK(command='PRIVACY'),
 reason text NOT NULL CHECK(length(reason)>=1 AND public.i2_document_text(reason,1000)), recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(version_id,root_id,patient_id) REFERENCES public.follow_up_intent_versions(id,root_id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(operation_id,root_id,patient_id,actor_user_id,command) REFERENCES public.follow_up_intent_operations(id,root_id,patient_id,actor_user_id,command) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE public.follow_up_intent_operations ADD FOREIGN KEY(result_version_id,root_id,patient_id) REFERENCES public.follow_up_intent_versions(id,root_id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.follow_up_intent_operations ADD FOREIGN KEY(result_link_id,root_id,patient_id) REFERENCES public.follow_up_intent_booking_links(id,root_id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX intent_patient_history ON public.follow_up_intents(patient_id,created_at DESC,id);
CREATE INDEX intent_consultation_history ON public.follow_up_intents(consultation_id,created_at DESC,id);
CREATE INDEX intent_author ON public.follow_up_intents(author_user_id);
CREATE INDEX intent_version_predecessor_scope ON public.follow_up_intent_versions(predecessor_id,root_id,patient_id);
CREATE INDEX intent_link_booking ON public.follow_up_intent_booking_links(booking_id,patient_id);
CREATE INDEX intent_link_actor ON public.follow_up_intent_booking_links(actor_user_id);
CREATE INDEX intent_privacy_root ON public.follow_up_intent_privacy_restrictions(root_id,patient_id);
CREATE INDEX intent_privacy_operation ON public.follow_up_intent_privacy_restrictions(operation_id,root_id,patient_id,actor_user_id,command);
CREATE FUNCTION public.i2_intent_root_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN NEW.created_at:=clock_timestamp(); RETURN NEW; END $$;
CREATE FUNCTION public.i2_intent_version_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE prior public.follow_up_intent_versions; root public.follow_up_intents;
BEGIN
 SELECT * INTO root FROM public.follow_up_intents WHERE id=NEW.root_id FOR UPDATE;
 SELECT * INTO prior FROM public.follow_up_intent_versions WHERE root_id=NEW.root_id ORDER BY version DESC LIMIT 1;
 IF root.id IS NULL OR EXISTS(SELECT 1 FROM public.follow_up_intent_privacy_restrictions WHERE root_id=root.id)
 OR (prior.id IS NULL AND (NEW.version<>1 OR NEW.command<>'DRAFT' OR NEW.predecessor_id IS NOT NULL))
 OR (prior.id IS NOT NULL AND (NEW.version<>prior.version+1 OR NEW.predecessor_id IS DISTINCT FROM prior.id OR (prior.state='DRAFT' AND NEW.command<>'RELEASE') OR (prior.state='SIGNED_RELEASED' AND NEW.command<>'CORRECT'))) THEN RAISE EXCEPTION 'Invalid intent lineage' USING ERRCODE='23514'; END IF;
 IF NEW.command='RELEASE' AND ROW(NEW.instruction,NEW.desired_start_at,NEW.desired_end_at,NEW.time_zone) IS DISTINCT FROM ROW(prior.instruction,prior.desired_start_at,prior.desired_end_at,prior.time_zone) THEN RAISE EXCEPTION 'Changed released source' USING ERRCODE='23514'; END IF;
 IF NEW.time_zone IS NOT NULL AND (NEW.time_zone !~ '^[A-Za-z][A-Za-z0-9_+/-]*$' OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=NEW.time_zone)) THEN RAISE EXCEPTION 'Invalid intent zone' USING ERRCODE='23514'; END IF;
 NEW.created_at:=greatest(clock_timestamp(),root.created_at,prior.created_at);
 NEW.signed_at:=CASE WHEN NEW.command<>'DRAFT' THEN NEW.created_at ELSE NULL END;
 NEW.released_at:=NEW.signed_at; RETURN NEW;
END $$;
CREATE FUNCTION public.i2_intent_link_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE prior public.follow_up_intent_booking_links; root public.follow_up_intents; old_booking uuid;
BEGIN
 -- Booking before root, same relative order as the service. Never slot acquisition here.
 SELECT booking_id INTO old_booking FROM public.follow_up_intent_booking_links WHERE id=NEW.predecessor_id;
 PERFORM id FROM public.bookings WHERE id IN (NEW.booking_id,old_booking) ORDER BY id FOR SHARE;
 SELECT * INTO root FROM public.follow_up_intents WHERE id=NEW.root_id FOR UPDATE;
 SELECT * INTO prior FROM public.follow_up_intent_booking_links WHERE root_id=NEW.root_id ORDER BY sequence DESC LIMIT 1;
 IF root.id IS NULL OR root.author_user_id<>NEW.actor_user_id OR root.patient_id<>NEW.patient_id
 OR NOT EXISTS(SELECT 1 FROM public.follow_up_intent_versions WHERE root_id=root.id AND state='SIGNED_RELEASED')
 OR EXISTS(SELECT 1 FROM public.follow_up_intent_privacy_restrictions WHERE root_id=root.id)
 OR NOT EXISTS(SELECT 1 FROM public.bookings WHERE id=NEW.booking_id AND patient_id=NEW.patient_id AND state='BOOKED')
 OR (prior.id IS NULL AND (NEW.sequence<>1 OR NEW.predecessor_id IS NOT NULL OR NEW.command<>'LINK'))
 OR (prior.id IS NOT NULL AND (NEW.sequence<>prior.sequence+1 OR NEW.predecessor_id IS DISTINCT FROM prior.id OR NEW.command<>'REPLACE' OR prior.booking_id=NEW.booking_id OR NOT EXISTS(SELECT 1 FROM public.bookings WHERE id=prior.booking_id AND state IN ('CANCELLED','RESCHEDULED')))) THEN RAISE EXCEPTION 'Invalid intent booking link' USING ERRCODE='23514'; END IF;
 NEW.recorded_at:=greatest(clock_timestamp(),root.created_at,prior.recorded_at); RETURN NEW;
END $$;
CREATE FUNCTION public.i2_intent_privacy_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE root public.follow_up_intents;
BEGIN
 SELECT * INTO root FROM public.follow_up_intents WHERE id=NEW.root_id FOR UPDATE;
 IF root.id IS NULL OR root.author_user_id<>NEW.actor_user_id OR root.patient_id<>NEW.patient_id THEN RAISE EXCEPTION 'Invalid intent privacy' USING ERRCODE='23514'; END IF;
 NEW.recorded_at:=greatest(clock_timestamp(),root.created_at); RETURN NEW;
END $$;
CREATE FUNCTION public.i2_intent_operation_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.follow_up_intents WHERE id=NEW.root_id AND patient_id=NEW.patient_id AND author_user_id=NEW.actor_user_id) THEN RAISE EXCEPTION 'Invalid intent operation' USING ERRCODE='23514'; END IF;
 NEW.recorded_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE FUNCTION public.i2_intent_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE expected_action text;
BEGIN
 IF TG_TABLE_NAME='follow_up_intents' THEN
  IF NOT EXISTS(SELECT 1 FROM public.follow_up_intent_versions WHERE root_id=NEW.id AND version=1 AND command='DRAFT') THEN RAISE EXCEPTION 'Missing intent draft' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW.version_limit<>(SELECT coalesce(max(version),0) FROM public.follow_up_intent_versions WHERE root_id=NEW.root_id) OR NEW.link_limit<>(SELECT coalesce(max(sequence),0) FROM public.follow_up_intent_booking_links WHERE root_id=NEW.root_id) THEN RAISE EXCEPTION 'Invalid retained result limits' USING ERRCODE='23514'; END IF;
  IF NEW.command IN ('DRAFT','RELEASE','CORRECT') AND NOT EXISTS(SELECT 1 FROM public.follow_up_intent_versions WHERE id=NEW.result_version_id AND root_id=NEW.root_id AND patient_id=NEW.patient_id AND author_user_id=NEW.actor_user_id AND operation_id=NEW.id AND command=NEW.command) THEN RAISE EXCEPTION 'Missing intent result' USING ERRCODE='23514'; END IF;
  IF NEW.command IN ('LINK','REPLACE') AND NOT EXISTS(SELECT 1 FROM public.follow_up_intent_booking_links WHERE id=NEW.result_link_id AND root_id=NEW.root_id AND patient_id=NEW.patient_id AND actor_user_id=NEW.actor_user_id AND operation_id=NEW.id AND command=NEW.command) THEN RAISE EXCEPTION 'Missing intent link result' USING ERRCODE='23514'; END IF;
  IF NEW.command='PRIVACY' AND NOT EXISTS(SELECT 1 FROM public.follow_up_intent_privacy_restrictions WHERE root_id=NEW.root_id AND patient_id=NEW.patient_id AND actor_user_id=NEW.actor_user_id AND operation_id=NEW.id) THEN RAISE EXCEPTION 'Missing intent privacy result' USING ERRCODE='23514'; END IF;
  expected_action:=CASE NEW.command WHEN 'DRAFT' THEN 'FOLLOW_UP_INTENT_DRAFTED' WHEN 'RELEASE' THEN 'FOLLOW_UP_INTENT_RELEASED' WHEN 'CORRECT' THEN 'FOLLOW_UP_INTENT_CORRECTED' WHEN 'LINK' THEN 'FOLLOW_UP_INTENT_BOOKING_LINKED' WHEN 'REPLACE' THEN 'FOLLOW_UP_INTENT_BOOKING_REPLACED' ELSE 'FOLLOW_UP_INTENT_PRIVACY_RESTRICTED' END;
  IF NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE id=NEW.audit_id AND actor_user_id=NEW.actor_user_id AND entity_type='follow_up_intent' AND entity_id=NEW.root_id AND action_type=expected_action AND safe_metadata='{}'::jsonb AND xmin::text::bigint=(pg_catalog.pg_current_xact_id()::text::bigint % 4294967296)) THEN RAISE EXCEPTION 'Missing intent audit' USING ERRCODE='23514'; END IF;
 END IF; RETURN NULL;
END $$;
CREATE FUNCTION public.i2_intent_privacy_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.follow_up_intent_operations WHERE id=NEW.operation_id AND command='PRIVACY' AND xmin::text::bigint=(pg_catalog.pg_current_xact_id()::text::bigint % 4294967296))
 OR (SELECT count(*) FROM public.follow_up_intent_privacy_restrictions WHERE operation_id=NEW.operation_id)>100
 OR EXISTS(SELECT 1 FROM public.follow_up_intent_privacy_restrictions WHERE operation_id=NEW.operation_id AND reason<>NEW.reason) THEN RAISE EXCEPTION 'Invalid frozen privacy operation' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER intent_privacy_complete AFTER INSERT ON public.follow_up_intent_privacy_restrictions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_intent_privacy_complete();
CREATE TRIGGER intent_root_insert BEFORE INSERT ON public.follow_up_intents FOR EACH ROW EXECUTE FUNCTION public.i2_intent_root_insert();
CREATE TRIGGER intent_version_insert BEFORE INSERT ON public.follow_up_intent_versions FOR EACH ROW EXECUTE FUNCTION public.i2_intent_version_insert();
CREATE TRIGGER intent_link_insert BEFORE INSERT ON public.follow_up_intent_booking_links FOR EACH ROW EXECUTE FUNCTION public.i2_intent_link_insert();
CREATE TRIGGER intent_privacy_insert BEFORE INSERT ON public.follow_up_intent_privacy_restrictions FOR EACH ROW EXECUTE FUNCTION public.i2_intent_privacy_insert();
CREATE TRIGGER intent_operation_insert BEFORE INSERT ON public.follow_up_intent_operations FOR EACH ROW EXECUTE FUNCTION public.i2_intent_operation_insert();
CREATE CONSTRAINT TRIGGER intent_complete AFTER INSERT ON public.follow_up_intents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_intent_complete();
CREATE CONSTRAINT TRIGGER intent_operation_complete AFTER INSERT ON public.follow_up_intent_operations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_intent_complete();
CREATE TRIGGER intent_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.follow_up_intents FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TRIGGER intent_version_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.follow_up_intent_versions FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TRIGGER intent_link_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.follow_up_intent_booking_links FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TRIGGER intent_operation_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.follow_up_intent_operations FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TRIGGER intent_privacy_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.follow_up_intent_privacy_restrictions FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
COMMIT;
