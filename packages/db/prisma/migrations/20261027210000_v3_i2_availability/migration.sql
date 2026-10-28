BEGIN;
-- btree_gist supplies UUID equality for the cross-clinic half-open exclusion.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
CREATE TABLE public.clinic_scheduling_settings (
 organization_id uuid NOT NULL, organization_kind public.organization_kind NOT NULL DEFAULT 'CLINIC',
 version integer NOT NULL, time_zone varchar(100) NOT NULL, duration_minutes integer NOT NULL,
 minimum_booking_lead integer NOT NULL, publication_horizon_days integer NOT NULL,
 changed_by_user_id uuid NOT NULL, admin_role public.user_role NOT NULL DEFAULT 'ADMIN',
 changed_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(organization_id,version),
 FOREIGN KEY(organization_id,organization_kind) REFERENCES public.organizations(id,kind) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(changed_by_user_id,admin_role) REFERENCES public.users(id,role) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT scheduling_bounds CHECK(organization_kind='CLINIC' AND admin_role='ADMIN' AND version>0 AND duration_minutes BETWEEN 5 AND 240 AND minimum_booking_lead BETWEEN 0 AND 10080 AND publication_horizon_days BETWEEN 1 AND 90 AND isfinite(changed_at))
);
CREATE FUNCTION public.i2_settings_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 -- Also serialize ordinary direct inserts, including the absent first version.
 PERFORM 1 FROM public.organizations WHERE id=NEW.organization_id AND kind='CLINIC' FOR UPDATE;
 IF NOT FOUND OR NEW.version<>(SELECT coalesce(max(version),0)+1 FROM public.clinic_scheduling_settings WHERE organization_id=NEW.organization_id) THEN
  RAISE EXCEPTION 'Invalid scheduling version' USING ERRCODE='23514',CONSTRAINT='scheduling_version_guard'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=NEW.time_zone) OR NEW.time_zone !~ '^[A-Za-z][A-Za-z0-9_+/-]*$' THEN
  RAISE EXCEPTION 'Invalid scheduling zone' USING ERRCODE='23514',CONSTRAINT='scheduling_zone_guard'; END IF;
 NEW.changed_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE FUNCTION public.i2_immutable() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'Scheduling history is immutable' USING ERRCODE='23514',CONSTRAINT='scheduling_immutable_guard'; END $$;
CREATE TRIGGER scheduling_insert BEFORE INSERT ON public.clinic_scheduling_settings FOR EACH ROW EXECUTE FUNCTION public.i2_settings_insert();
CREATE TRIGGER scheduling_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.clinic_scheduling_settings FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TABLE public.availability_slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinician_id uuid NOT NULL, clinician_user_id uuid NOT NULL,
 organization_id uuid NOT NULL, provider_id uuid NOT NULL, membership_id uuid NOT NULL, affiliation_id uuid NOT NULL,
 user_role public.user_role NOT NULL DEFAULT 'CLINICIAN', organization_kind public.organization_kind NOT NULL DEFAULT 'CLINIC',
 start_at timestamptz(3) NOT NULL,end_at timestamptz(3) NOT NULL,
 time_zone varchar(100) NOT NULL,configuration_version integer NOT NULL,duration_minutes integer NOT NULL,minimum_booking_lead integer NOT NULL,publication_horizon_days integer NOT NULL,
 capacity integer NOT NULL DEFAULT 1,state text NOT NULL DEFAULT 'PUBLISHED',version integer NOT NULL DEFAULT 1,
 published_by_user_id uuid NOT NULL,published_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),operation_key uuid NOT NULL,
 withdrawn_by_user_id uuid,withdrawn_at timestamptz(3),
 FOREIGN KEY(clinician_id,clinician_user_id) REFERENCES public.clinician_profiles(id,user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(provider_id,clinician_user_id) REFERENCES public.clinician_directory(id,clinician_user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(membership_id,clinician_user_id,organization_id,user_role,organization_kind) REFERENCES public.organization_memberships(id,user_id,organization_id,user_role,organization_kind) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(affiliation_id) REFERENCES public.directory_affiliations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(organization_id,configuration_version) REFERENCES public.clinic_scheduling_settings(organization_id,version) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(published_by_user_id,user_role) REFERENCES public.users(id,role) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(withdrawn_by_user_id,user_role) REFERENCES public.users(id,role) ON UPDATE RESTRICT ON DELETE RESTRICT,
 UNIQUE(published_by_user_id,operation_key),
 CONSTRAINT availability_structure CHECK(user_role='CLINICIAN' AND organization_kind='CLINIC' AND published_by_user_id=clinician_user_id AND capacity=1 AND isfinite(start_at) AND isfinite(end_at) AND start_at<end_at AND end_at-start_at=duration_minutes*interval '1 minute' AND duration_minutes BETWEEN 5 AND 240 AND minimum_booking_lead BETWEEN 0 AND 10080 AND publication_horizon_days BETWEEN 1 AND 90 AND isfinite(published_at)),
 CONSTRAINT availability_lifecycle CHECK((state='PUBLISHED' AND version=1 AND withdrawn_at IS NULL AND withdrawn_by_user_id IS NULL) OR (state='WITHDRAWN' AND version=2 AND withdrawn_by_user_id=clinician_user_id AND withdrawn_at IS NOT NULL AND isfinite(withdrawn_at) AND withdrawn_at>=published_at)),
 CONSTRAINT availability_clinician_overlap EXCLUDE USING gist(clinician_id WITH =,tstzrange(start_at,end_at,'[)') WITH &&) WHERE(state='PUBLISHED')
);
CREATE INDEX availability_history ON public.availability_slots(clinician_user_id,start_at,id);
CREATE INDEX availability_public ON public.availability_slots(provider_id,start_at,id) WHERE state='PUBLISHED';
CREATE FUNCTION public.i2_slot_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE c public.clinic_scheduling_settings%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.state<>'PUBLISHED' OR NEW.state<>'WITHDRAWN' OR NEW.version<>2 OR NEW.withdrawn_by_user_id<>OLD.clinician_user_id OR (to_jsonb(NEW)-ARRAY['state','version','withdrawn_at','withdrawn_by_user_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version','withdrawn_at','withdrawn_by_user_id']) THEN
   RAISE EXCEPTION 'Invalid availability transition' USING ERRCODE='23514',CONSTRAINT='availability_terminal_guard'; END IF;
  NEW.withdrawn_at:=greatest(clock_timestamp(),OLD.published_at); RETURN NEW;
 END IF;
 PERFORM 1 FROM public.organizations WHERE id=NEW.organization_id FOR SHARE;
 SELECT * INTO c FROM public.clinic_scheduling_settings WHERE organization_id=NEW.organization_id ORDER BY version DESC LIMIT 1 FOR SHARE;
 IF c.version IS NULL OR (NEW.configuration_version,NEW.time_zone,NEW.duration_minutes,NEW.minimum_booking_lead,NEW.publication_horizon_days) IS DISTINCT FROM (c.version,c.time_zone,c.duration_minutes,c.minimum_booking_lead,c.publication_horizon_days) THEN
  RAISE EXCEPTION 'Invalid scheduling snapshot' USING ERRCODE='23514',CONSTRAINT='availability_snapshot_guard'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.directory_affiliations a WHERE a.id=NEW.affiliation_id AND a.provider_id=NEW.provider_id AND a.membership_id=NEW.membership_id AND a.clinician_user_id=NEW.clinician_user_id AND a.organization_id=NEW.organization_id) THEN
  RAISE EXCEPTION 'Invalid availability provenance' USING ERRCODE='23514',CONSTRAINT='availability_provenance_guard'; END IF;
 NEW.published_at:=clock_timestamp();
 IF NEW.state<>'PUBLISHED' OR NEW.version<>1 OR NEW.withdrawn_at IS NOT NULL OR NEW.withdrawn_by_user_id IS NOT NULL OR NEW.start_at<=NEW.published_at OR NEW.end_at>NEW.published_at+c.publication_horizon_days*interval '24 hours' THEN
  RAISE EXCEPTION 'Invalid initial availability' USING ERRCODE='23514',CONSTRAINT='availability_initial_guard'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER availability_write BEFORE INSERT OR UPDATE ON public.availability_slots FOR EACH ROW EXECUTE FUNCTION public.i2_slot_guard();
CREATE TRIGGER availability_removal BEFORE DELETE OR TRUNCATE ON public.availability_slots FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TABLE public.availability_operations (
 actor_user_id uuid NOT NULL REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 command text NOT NULL CHECK(command IN ('PUBLISH','WITHDRAW')),operation_key uuid NOT NULL,
 fingerprint char(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 slot_id uuid NOT NULL REFERENCES public.availability_slots(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,command,operation_key)
);
CREATE TRIGGER availability_operation_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.availability_operations FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
COMMIT;
