-- Slice 5 only. No historical SQL changes, backfill or fabricated documentation.
CREATE FUNCTION public.i2_document_text(v text, bound integer) RETURNS boolean LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT length(v)<=bound AND v !~ U&'[\0001-\0009\000B-\001F\007F-\009F]'
$$;
CREATE FUNCTION public.i2_document_items(v text[], bound integer) RETURNS boolean LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 SELECT cardinality(v)<=20 AND coalesce(array_ndims(v),1)=1 AND NOT EXISTS(SELECT 1 FROM unnest(v) x WHERE x IS NULL OR NOT public.i2_document_text(x,bound))
$$;
CREATE FUNCTION public.i2_allergy_items(v jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE STRICT SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE item jsonb;
BEGIN
 IF jsonb_typeof(v)<>'array' OR jsonb_array_length(v)>20 THEN RETURN false; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(v) LOOP
  IF jsonb_typeof(item)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(item))<>3 OR NOT item ?& ARRAY['kind','text','reaction'] OR jsonb_typeof(item->'kind') IS DISTINCT FROM 'string' OR coalesce(item->>'kind','') NOT IN ('ALLERGY','INTOLERANCE') OR jsonb_typeof(item->'text')<>'string' OR length(item->>'text')<1 OR NOT public.i2_document_text(item->>'text',500) OR NOT (item->'reaction'='null'::jsonb OR (jsonb_typeof(item->'reaction')='string' AND length(item->>'reaction')>=1 AND public.i2_document_text(item->>'reaction',500))) THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
CREATE TABLE public.consultation_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 encounter_id uuid NOT NULL, patient_id uuid NOT NULL,
 author_user_id uuid NOT NULL, author_clinician_id uuid NOT NULL,
 kind varchar(24) NOT NULL CHECK(kind IN ('PRIVATE_NOTE','PATIENT_SUMMARY')),
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(encounter_id,patient_id) REFERENCES public.clinical_encounters(id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(author_clinician_id,author_user_id) REFERENCES public.clinician_profiles(id,user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 UNIQUE(id,consultation_id,encounter_id,patient_id,author_user_id,author_clinician_id,kind)
);
CREATE TABLE public.consultation_document_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 command varchar(24) NOT NULL CHECK(command IN ('DRAFT','SIGN','RELEASE','ADDENDUM','CORRECT','PRIVACY')),
 operation_key uuid NOT NULL CHECK(operation_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'), fingerprint varchar(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 document_id uuid NOT NULL REFERENCES public.consultation_documents(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 result_version_id uuid,
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(actor_user_id,command,operation_key), UNIQUE(id,actor_user_id,command), UNIQUE(id,document_id,actor_user_id,command),
 CHECK((command='PRIVACY')=(result_version_id IS NULL))
);
CREATE TABLE public.consultation_document_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL,
 consultation_id uuid NOT NULL, encounter_id uuid NOT NULL, patient_id uuid NOT NULL,
 author_user_id uuid NOT NULL, author_clinician_id uuid NOT NULL,
 document_kind varchar(24) NOT NULL,
 version integer NOT NULL CHECK(version>0),
 kind varchar(24) NOT NULL CHECK(kind IN ('DRAFT','SIGN','RELEASE','ADDENDUM','CORRECT')),
 state varchar(24) NOT NULL CHECK(state IN ('DRAFT','SIGNED','SIGNED_RELEASED')),
 predecessor_id uuid UNIQUE,
 content text NOT NULL CHECK(public.i2_document_text(content,8000)),
 patient_instructions text NOT NULL CHECK(public.i2_document_text(patient_instructions,8000)),
 complaint text CHECK(public.i2_document_text(complaint,2000)),
 problems text[] NOT NULL CHECK(public.i2_document_items(problems,500)),
 diagnoses text[] NOT NULL CHECK(public.i2_document_items(diagnoses,500)),
 allergy_state varchar(24) NOT NULL CHECK(allergy_state IN ('REVIEWED_POSITIVE','REVIEWED_NO_KNOWN','UNKNOWN','NOT_REVIEWED')),
 allergy_items jsonb NOT NULL CHECK(public.i2_allergy_items(allergy_items)),
 reviewer_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 reviewed_at timestamptz(3),
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), signed_at timestamptz(3), released_at timestamptz(3),
 reason text CHECK(length(reason)>=1 AND public.i2_document_text(reason,1000)),
 operation_id uuid NOT NULL UNIQUE,
 FOREIGN KEY(document_id,consultation_id,encounter_id,patient_id,author_user_id,author_clinician_id,document_kind) REFERENCES public.consultation_documents(id,consultation_id,encounter_id,patient_id,author_user_id,author_clinician_id,kind) ON DELETE RESTRICT ON UPDATE RESTRICT,
 UNIQUE(id,document_id), UNIQUE(document_id,version),
 FOREIGN KEY(predecessor_id,document_id) REFERENCES public.consultation_document_versions(id,document_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(operation_id,author_user_id,kind) REFERENCES public.consultation_document_operations(id,actor_user_id,command) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 CHECK((allergy_state='REVIEWED_POSITIVE')=(jsonb_array_length(allergy_items)>0)),
 CHECK((allergy_state IN ('REVIEWED_POSITIVE','REVIEWED_NO_KNOWN') AND reviewer_user_id=author_user_id AND reviewed_at IS NOT NULL) OR (allergy_state IN ('UNKNOWN','NOT_REVIEWED') AND reviewer_user_id IS NULL AND reviewed_at IS NULL)),
 CHECK((kind='DRAFT' AND state='DRAFT' AND version=1 AND predecessor_id IS NULL AND signed_at IS NULL AND released_at IS NULL) OR (kind<>'DRAFT' AND version>1 AND predecessor_id IS NOT NULL AND signed_at IS NOT NULL AND ((document_kind='PRIVATE_NOTE' AND state='SIGNED' AND released_at IS NULL AND kind<>'RELEASE' AND patient_instructions='') OR (document_kind='PATIENT_SUMMARY' AND state='SIGNED_RELEASED' AND released_at=signed_at AND kind<>'SIGN')))),
 CHECK(document_kind<>'PRIVATE_NOTE' OR patient_instructions=''),
 CHECK((kind IN ('ADDENDUM','CORRECT'))=(reason IS NOT NULL))
);
ALTER TABLE public.consultation_document_operations ADD FOREIGN KEY(result_version_id,document_id) REFERENCES public.consultation_document_versions(id,document_id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE public.consultation_privacy_restrictions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL,
 version_id uuid NOT NULL UNIQUE, actor_user_id uuid NOT NULL,
 command varchar(24) NOT NULL DEFAULT 'PRIVACY' CHECK(command='PRIVACY'),
 operation_id uuid NOT NULL,
 reason text NOT NULL CHECK(length(reason)>=1 AND public.i2_document_text(reason,1000)),
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(version_id,document_id) REFERENCES public.consultation_document_versions(id,document_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT document_privacy_operation_scope FOREIGN KEY(operation_id,document_id,actor_user_id,command) REFERENCES public.consultation_document_operations(id,document_id,actor_user_id,command) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX document_patient_projection ON public.consultation_documents(patient_id,created_at DESC,id);
CREATE INDEX document_consultation_projection ON public.consultation_documents(consultation_id,created_at DESC,id);
CREATE FUNCTION public.i2_document_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.consultations c WHERE c.id=NEW.consultation_id AND c.encounter_id=NEW.encounter_id AND c.patient_id=NEW.patient_id AND c.treating_clinician_id=NEW.author_clinician_id AND c.treating_clinician_user_id=NEW.author_user_id) THEN RAISE EXCEPTION 'Invalid document provenance' USING ERRCODE='23514'; END IF;
 NEW.created_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER document_insert BEFORE INSERT ON public.consultation_documents FOR EACH ROW EXECUTE FUNCTION public.i2_document_insert();
CREATE FUNCTION public.i2_document_version_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE prior public.consultation_document_versions; stamp timestamptz(3);
BEGIN
 PERFORM id FROM public.consultation_documents WHERE id=NEW.document_id FOR UPDATE;
 SELECT * INTO prior FROM public.consultation_document_versions WHERE document_id=NEW.document_id ORDER BY version DESC LIMIT 1;
 IF (prior.id IS NULL AND (NEW.kind<>'DRAFT' OR NEW.version<>1)) OR (prior.id IS NOT NULL AND (NEW.version<>prior.version+1 OR NEW.predecessor_id IS DISTINCT FROM prior.id OR (NEW.kind IN ('SIGN','RELEASE') AND prior.state<>'DRAFT') OR (NEW.kind IN ('ADDENDUM','CORRECT') AND prior.state='DRAFT') OR NEW.kind='DRAFT')) THEN RAISE EXCEPTION 'Invalid document lineage' USING ERRCODE='23514'; END IF;
 IF NEW.kind IN ('SIGN','RELEASE') AND ROW(NEW.content,NEW.patient_instructions,NEW.complaint,NEW.problems,NEW.diagnoses,NEW.allergy_state,NEW.allergy_items,NEW.reviewer_user_id,NEW.reviewed_at) IS DISTINCT FROM ROW(prior.content,prior.patient_instructions,prior.complaint,prior.problems,prior.diagnoses,prior.allergy_state,prior.allergy_items,prior.reviewer_user_id,prior.reviewed_at) THEN RAISE EXCEPTION 'Changed signed source' USING ERRCODE='23514'; END IF;
 stamp:=clock_timestamp(); NEW.created_at:=stamp;
 IF NEW.kind<>'DRAFT' THEN NEW.signed_at:=stamp; NEW.released_at:=CASE WHEN NEW.document_kind='PATIENT_SUMMARY' THEN stamp ELSE NULL END; END IF;
 IF NEW.kind IN ('DRAFT','ADDENDUM','CORRECT') THEN
  NEW.reviewer_user_id:=CASE WHEN NEW.allergy_state IN ('REVIEWED_POSITIVE','REVIEWED_NO_KNOWN') THEN NEW.author_user_id ELSE NULL END;
  NEW.reviewed_at:=CASE WHEN NEW.reviewer_user_id IS NOT NULL THEN stamp ELSE NULL END;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER document_version_insert BEFORE INSERT ON public.consultation_document_versions FOR EACH ROW EXECUTE FUNCTION public.i2_document_version_insert();
CREATE FUNCTION public.i2_document_privacy_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.consultation_documents WHERE id=NEW.document_id AND author_user_id=NEW.actor_user_id) THEN RAISE EXCEPTION 'Invalid privacy provenance' USING ERRCODE='23514'; END IF;
 NEW.recorded_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER document_privacy_insert BEFORE INSERT ON public.consultation_privacy_restrictions FOR EACH ROW EXECUTE FUNCTION public.i2_document_privacy_insert();
CREATE FUNCTION public.i2_document_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='consultation_documents' AND NOT EXISTS(SELECT 1 FROM public.consultation_document_versions WHERE document_id=NEW.id AND version=1 AND kind='DRAFT') THEN RAISE EXCEPTION 'Missing draft source' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='consultation_document_operations' THEN
  IF NEW.command='PRIVACY' THEN
   IF NOT EXISTS(SELECT 1 FROM public.consultation_privacy_restrictions WHERE operation_id=NEW.id AND document_id=NEW.document_id AND actor_user_id=NEW.actor_user_id) THEN RAISE EXCEPTION 'Missing privacy target' USING ERRCODE='23514'; END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM public.consultation_document_versions WHERE id=NEW.result_version_id AND document_id=NEW.document_id AND operation_id=NEW.id AND kind=NEW.command AND author_user_id=NEW.actor_user_id) THEN RAISE EXCEPTION 'Missing document result' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER document_complete AFTER INSERT ON public.consultation_documents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_document_complete();
CREATE CONSTRAINT TRIGGER document_operation_complete AFTER INSERT ON public.consultation_document_operations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i2_document_complete();
CREATE TRIGGER document_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.consultation_documents FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TRIGGER document_version_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.consultation_document_versions FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TRIGGER document_operation_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.consultation_document_operations FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
CREATE TRIGGER document_privacy_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.consultation_privacy_restrictions FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable();
