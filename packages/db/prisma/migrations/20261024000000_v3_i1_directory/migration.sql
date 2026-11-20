BEGIN;
ALTER TABLE public.clinician_profiles ADD CONSTRAINT clinician_profiles_id_user_key UNIQUE(id,user_id);
ALTER TABLE public.organization_memberships ADD CONSTRAINT memberships_directory_scope_key UNIQUE(id,user_id,organization_id,user_role,organization_kind);
CREATE TABLE public.specialties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 is_published boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 0,
 created_by_user_id uuid NOT NULL, changed_by_user_id uuid NOT NULL,
 admin_role public.user_role NOT NULL DEFAULT 'ADMIN', operation_key uuid NOT NULL,
 creation_fingerprint char(64) NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT now(), changed_at timestamptz(3) NOT NULL DEFAULT now(),
 key varchar(48) NOT NULL, display_name varchar(80) NOT NULL,
 CONSTRAINT directory_specialty_public_key UNIQUE(key),
 CONSTRAINT directory_specialty_key_check CHECK(length(key)<=48 AND key ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
 CONSTRAINT directory_specialty_name_check CHECK(length(display_name) BETWEEN 1 AND 80 AND display_name=btrim(display_name) AND display_name !~ '[[:cntrl:]]'),
 CONSTRAINT specialties_creator_fk FOREIGN KEY(created_by_user_id,admin_role) REFERENCES public.users(id,role) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT specialties_actor_fk FOREIGN KEY(changed_by_user_id,admin_role) REFERENCES public.users(id,role) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT specialties_operation_key UNIQUE(created_by_user_id,operation_key),
 CONSTRAINT specialties_admin_check CHECK(admin_role='ADMIN'),
 CONSTRAINT specialties_history_check CHECK(version>=0 AND isfinite(created_at) AND isfinite(changed_at) AND changed_at>=created_at AND creation_fingerprint ~ '^[0-9a-f]{64}$')
);
CREATE TABLE public.clinic_directory (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 is_published boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 0,
 created_by_user_id uuid NOT NULL, changed_by_user_id uuid NOT NULL,
 admin_role public.user_role NOT NULL DEFAULT 'ADMIN', operation_key uuid NOT NULL,
 creation_fingerprint char(64) NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT now(), changed_at timestamptz(3) NOT NULL DEFAULT now(),
 public_id uuid NOT NULL DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, organization_kind public.organization_kind NOT NULL DEFAULT 'CLINIC',
 display_name varchar(160) NOT NULL, city varchar(80) NOT NULL, address varchar(240) NOT NULL,
 CONSTRAINT directory_clinic_public_key UNIQUE(public_id), CONSTRAINT directory_clinic_organization_key UNIQUE(organization_id), CONSTRAINT directory_clinic_org_kind_key UNIQUE(organization_id,organization_kind),
 CONSTRAINT directory_clinic_organization_fk FOREIGN KEY(organization_id,organization_kind) REFERENCES public.organizations(id,kind) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT directory_clinic_kind_check CHECK(organization_kind='CLINIC'),
 CONSTRAINT directory_clinic_locator_check CHECK(public_id<>id AND public_id<>organization_id),
 CONSTRAINT directory_clinic_text_check CHECK(length(display_name) BETWEEN 1 AND 160 AND display_name=btrim(display_name) AND display_name !~ '[[:cntrl:]]'
 AND length(city) BETWEEN 1 AND 80 AND city=btrim(city) AND city !~ '[[:cntrl:]]' AND length(address) BETWEEN 1 AND 240 AND address=btrim(address) AND address !~ '[[:cntrl:]]'),
 CONSTRAINT clinic_directory_creator_fk FOREIGN KEY(created_by_user_id,admin_role) REFERENCES public.users(id,role) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT clinic_directory_actor_fk FOREIGN KEY(changed_by_user_id,admin_role) REFERENCES public.users(id,role) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT clinic_directory_operation_key UNIQUE(created_by_user_id,operation_key),
 CONSTRAINT clinic_directory_admin_check CHECK(admin_role='ADMIN'),
 CONSTRAINT clinic_directory_history_check CHECK(version>=0 AND isfinite(created_at) AND isfinite(changed_at) AND changed_at>=created_at AND creation_fingerprint ~ '^[0-9a-f]{64}$')
);
CREATE TABLE public.clinician_directory (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 is_published boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 0,
 created_by_user_id uuid NOT NULL, changed_by_user_id uuid NOT NULL,
 admin_role public.user_role NOT NULL DEFAULT 'ADMIN', operation_key uuid NOT NULL,
 creation_fingerprint char(64) NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT now(), changed_at timestamptz(3) NOT NULL DEFAULT now(),
 public_id uuid NOT NULL DEFAULT gen_random_uuid(), clinician_id uuid NOT NULL, clinician_user_id uuid NOT NULL, specialty_id uuid NOT NULL, display_name varchar(160) NOT NULL,
 CONSTRAINT directory_provider_public_key UNIQUE(public_id), CONSTRAINT directory_provider_clinician_key UNIQUE(clinician_id), CONSTRAINT directory_provider_profile_key UNIQUE(clinician_id,clinician_user_id), CONSTRAINT directory_provider_user_key UNIQUE(id,clinician_user_id),
 CONSTRAINT directory_provider_profile_fk FOREIGN KEY(clinician_id,clinician_user_id) REFERENCES public.clinician_profiles(id,user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT directory_provider_specialty_fk FOREIGN KEY(specialty_id) REFERENCES public.specialties(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT directory_provider_locator_check CHECK(public_id<>id AND public_id<>clinician_id AND public_id<>clinician_user_id),
 CONSTRAINT directory_provider_text_check CHECK(length(display_name) BETWEEN 1 AND 160 AND display_name=btrim(display_name) AND display_name !~ '[[:cntrl:]]'),
 CONSTRAINT clinician_directory_creator_fk FOREIGN KEY(created_by_user_id,admin_role) REFERENCES public.users(id,role) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT clinician_directory_actor_fk FOREIGN KEY(changed_by_user_id,admin_role) REFERENCES public.users(id,role) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT clinician_directory_operation_key UNIQUE(created_by_user_id,operation_key),
 CONSTRAINT clinician_directory_admin_check CHECK(admin_role='ADMIN'),
 CONSTRAINT clinician_directory_history_check CHECK(version>=0 AND isfinite(created_at) AND isfinite(changed_at) AND changed_at>=created_at AND creation_fingerprint ~ '^[0-9a-f]{64}$')
);
CREATE INDEX directory_provider_specialty_idx ON public.clinician_directory(specialty_id,is_published,public_id);
CREATE INDEX directory_clinic_published_idx ON public.clinic_directory(is_published,public_id);
CREATE INDEX directory_specialty_published_idx ON public.specialties(is_published,key);
CREATE TABLE public.directory_affiliations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid NOT NULL, clinician_user_id uuid NOT NULL,
 membership_id uuid NOT NULL, organization_id uuid NOT NULL,
 user_role public.user_role NOT NULL DEFAULT 'CLINICIAN', organization_kind public.organization_kind NOT NULL DEFAULT 'CLINIC', specialty_id uuid NOT NULL,
 published_by_user_id uuid NOT NULL, admin_role public.user_role NOT NULL DEFAULT 'ADMIN', operation_key uuid NOT NULL,
 published_at timestamptz(3) NOT NULL DEFAULT now(), withdrawn_by_user_id uuid, withdrawn_at timestamptz(3),
 CONSTRAINT directory_affiliation_operation_key UNIQUE(published_by_user_id,operation_key),
 CONSTRAINT directory_affiliation_provider_fk FOREIGN KEY(provider_id,clinician_user_id) REFERENCES public.clinician_directory(id,clinician_user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT directory_affiliation_membership_fk FOREIGN KEY(membership_id,clinician_user_id,organization_id,user_role,organization_kind) REFERENCES public.organization_memberships(id,user_id,organization_id,user_role,organization_kind) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT directory_affiliation_clinic_fk FOREIGN KEY(organization_id) REFERENCES public.clinic_directory(organization_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT directory_affiliation_specialty_fk FOREIGN KEY(specialty_id) REFERENCES public.specialties(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT directory_affiliation_publisher_fk FOREIGN KEY(published_by_user_id,admin_role) REFERENCES public.users(id,role) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT directory_affiliation_withdrawer_fk FOREIGN KEY(withdrawn_by_user_id,admin_role) REFERENCES public.users(id,role) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT directory_affiliation_role_check CHECK(user_role='CLINICIAN' AND organization_kind='CLINIC' AND admin_role='ADMIN'),
 CONSTRAINT directory_affiliation_history_check CHECK(isfinite(published_at) AND ((withdrawn_at IS NULL AND withdrawn_by_user_id IS NULL) OR (withdrawn_at IS NOT NULL AND withdrawn_by_user_id IS NOT NULL AND isfinite(withdrawn_at) AND withdrawn_at>=published_at)))
);
CREATE UNIQUE INDEX directory_affiliation_active_key ON public.directory_affiliations(provider_id,membership_id) WHERE withdrawn_at IS NULL;
CREATE INDEX directory_affiliation_clinic_idx ON public.directory_affiliations(organization_id,provider_id);

CREATE FUNCTION public.i1d_guard_source() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE mutable text[]; eligible boolean;
BEGIN
 IF TG_TABLE_NAME='specialties' THEN mutable:=ARRAY['display_name','is_published','version','changed_by_user_id','changed_at'];
 ELSIF TG_TABLE_NAME='clinic_directory' THEN mutable:=ARRAY['display_name','city','address','is_published','version','changed_by_user_id','changed_at'];
 ELSE mutable:=ARRAY['display_name','specialty_id','is_published','version','changed_by_user_id','changed_at']; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.is_published OR NEW.version<>0 OR NEW.changed_by_user_id<>NEW.created_by_user_id OR NEW.changed_at<>NEW.created_at THEN
   RAISE EXCEPTION 'Invalid initial directory state' USING ERRCODE='23514',CONSTRAINT='directory_source_history_guard';
  END IF;
 ELSE
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW)-mutable) IS DISTINCT FROM (to_jsonb(OLD)-mutable) OR NEW.version<>OLD.version+1 OR NEW.changed_at<OLD.changed_at THEN
   RAISE EXCEPTION 'Directory identity/history cannot be rewritten' USING ERRCODE='23514',CONSTRAINT='directory_source_history_guard';
  END IF;
  IF TG_TABLE_NAME='clinician_directory' THEN
   IF NEW.specialty_id<>OLD.specialty_id THEN
   IF NEW.is_published OR EXISTS(SELECT 1 FROM public.directory_affiliations a WHERE a.provider_id=OLD.id AND a.withdrawn_at IS NULL) THEN
    RAISE EXCEPTION 'Withdraw specialty publications first' USING ERRCODE='23514',CONSTRAINT='directory_specialty_change_guard';
   END IF;
   END IF;
  END IF;
 END IF;
 IF TG_TABLE_NAME='clinic_directory' AND NEW.is_published THEN
  IF NOT EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=NEW.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE') THEN
   RAISE EXCEPTION 'Clinic not eligible' USING ERRCODE='23514',CONSTRAINT='directory_clinic_eligibility_guard'; END IF;
 END IF;
 IF TG_TABLE_NAME='clinician_directory' AND NEW.is_published THEN
  SELECT EXISTS(SELECT 1 FROM public.users u JOIN public.clinician_profiles cp ON cp.user_id=u.id AND cp.id=NEW.clinician_id
   JOIN public.specialties s ON s.id=NEW.specialty_id AND s.is_published
   JOIN public.directory_affiliations a ON a.provider_id=NEW.id AND a.specialty_id=s.id AND a.withdrawn_at IS NULL
   JOIN public.organization_memberships m ON m.id=a.membership_id AND m.user_id=u.id AND m.organization_id=a.organization_id AND m.user_role='CLINICIAN' AND m.organization_kind='CLINIC' AND m.status='ACTIVE' AND m.ended_at IS NULL
   JOIN public.organizations o ON o.id=m.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE'
   JOIN public.clinic_directory c ON c.organization_id=o.id AND c.is_published
   WHERE u.id=NEW.clinician_user_id AND u.role='CLINICIAN' AND u.status='ACTIVE') INTO eligible;
  IF NOT eligible THEN RAISE EXCEPTION 'Provider not eligible' USING ERRCODE='23514',CONSTRAINT='directory_provider_eligibility_guard'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.i1d_guard_affiliation() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE p public.clinician_directory%ROWTYPE; m public.organization_memberships%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  IF OLD.withdrawn_at IS NOT NULL OR NEW.withdrawn_at IS NULL OR (to_jsonb(NEW)-ARRAY['withdrawn_at','withdrawn_by_user_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['withdrawn_at','withdrawn_by_user_id']) THEN
   RAISE EXCEPTION 'Publication history is terminal' USING ERRCODE='23514',CONSTRAINT='directory_affiliation_terminal_guard'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.withdrawn_at IS NOT NULL OR NEW.withdrawn_by_user_id IS NOT NULL THEN
  RAISE EXCEPTION 'Publication must begin current' USING ERRCODE='23514',CONSTRAINT='directory_affiliation_terminal_guard'; END IF;
 -- Fully qualified durable tables prevent TEMP shadow authority. Normal service
 -- paths already hold these in user/session/profile/specialty/org/member order.
 PERFORM 1 FROM public.users u WHERE u.id=NEW.clinician_user_id AND u.role='CLINICIAN' AND u.status='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Publication not eligible' USING ERRCODE='23514',CONSTRAINT='directory_affiliation_eligibility_guard'; END IF;
 PERFORM 1 FROM public.specialties s WHERE s.id=NEW.specialty_id AND s.is_published FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Publication not eligible' USING ERRCODE='23514',CONSTRAINT='directory_affiliation_eligibility_guard'; END IF;
 PERFORM 1 FROM public.organizations o WHERE o.id=NEW.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Publication not eligible' USING ERRCODE='23514',CONSTRAINT='directory_affiliation_eligibility_guard'; END IF;
 PERFORM 1 FROM public.clinic_directory c WHERE c.organization_id=NEW.organization_id AND c.is_published FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Publication not eligible' USING ERRCODE='23514',CONSTRAINT='directory_affiliation_eligibility_guard'; END IF;
 SELECT * INTO m FROM public.organization_memberships WHERE id=NEW.membership_id FOR SHARE;
 SELECT * INTO p FROM public.clinician_directory WHERE id=NEW.provider_id FOR SHARE;
 IF m.id IS NULL OR p.id IS NULL OR m.status<>'ACTIVE' OR m.ended_at IS NOT NULL OR m.user_role<>'CLINICIAN' OR m.organization_kind<>'CLINIC'
 OR m.user_id<>NEW.clinician_user_id OR m.organization_id<>NEW.organization_id OR p.clinician_user_id<>NEW.clinician_user_id OR p.specialty_id<>NEW.specialty_id THEN
  RAISE EXCEPTION 'Publication not eligible' USING ERRCODE='23514',CONSTRAINT='directory_affiliation_eligibility_guard'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER specialties_write_guard BEFORE INSERT OR UPDATE ON public.specialties FOR EACH ROW EXECUTE FUNCTION public.i1d_guard_source();
CREATE TRIGGER specialties_removal_guard BEFORE DELETE OR TRUNCATE ON public.specialties FOR EACH STATEMENT EXECUTE FUNCTION public.i1_reject_removal();
CREATE TRIGGER clinic_directory_write_guard BEFORE INSERT OR UPDATE ON public.clinic_directory FOR EACH ROW EXECUTE FUNCTION public.i1d_guard_source();
CREATE TRIGGER clinic_directory_removal_guard BEFORE DELETE OR TRUNCATE ON public.clinic_directory FOR EACH STATEMENT EXECUTE FUNCTION public.i1_reject_removal();
CREATE TRIGGER clinician_directory_write_guard BEFORE INSERT OR UPDATE ON public.clinician_directory FOR EACH ROW EXECUTE FUNCTION public.i1d_guard_source();
CREATE TRIGGER clinician_directory_removal_guard BEFORE DELETE OR TRUNCATE ON public.clinician_directory FOR EACH STATEMENT EXECUTE FUNCTION public.i1_reject_removal();
CREATE TRIGGER directory_affiliations_write_guard BEFORE INSERT OR UPDATE ON public.directory_affiliations FOR EACH ROW EXECUTE FUNCTION public.i1d_guard_affiliation();
CREATE TRIGGER directory_affiliations_removal_guard BEFORE DELETE OR TRUNCATE ON public.directory_affiliations FOR EACH STATEMENT EXECUTE FUNCTION public.i1_reject_removal();
COMMIT;
