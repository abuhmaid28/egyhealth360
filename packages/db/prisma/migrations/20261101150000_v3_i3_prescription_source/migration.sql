-- I3 Slice 1. Additive only; curated catalog has no patient assignments or dosing rules.
CREATE TABLE public.medications (
 id uuid PRIMARY KEY, created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.medication_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 version integer NOT NULL CHECK(version>0), display_name text NOT NULL CHECK(length(btrim(display_name))>0 AND public.i2_document_text(display_name,200)),
 is_active boolean NOT NULL, is_published boolean NOT NULL,
 actor_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 operation_id uuid UNIQUE, recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(medication_id,version), CHECK((version=1)=(operation_id IS NULL)), CHECK((operation_id IS NULL)=(actor_user_id IS NULL))
);
INSERT INTO public.medications(id) VALUES ('a3d10000-0000-4000-8000-000000000001'),('a3d10000-0000-4000-8000-000000000002'),('a3d10000-0000-4000-8000-000000000003');
INSERT INTO public.medication_versions(medication_id,version,display_name,is_active,is_published) VALUES
 ('a3d10000-0000-4000-8000-000000000001',1,'Paracetamol',true,true),
 ('a3d10000-0000-4000-8000-000000000002',1,'Amoxicillin',true,true),
 ('a3d10000-0000-4000-8000-000000000003',1,'Saline nasal spray',true,true);
CREATE TABLE public.prescriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 encounter_id uuid NOT NULL, patient_id uuid NOT NULL, author_user_id uuid NOT NULL, author_clinician_id uuid NOT NULL,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 membership_id uuid NOT NULL REFERENCES public.organization_memberships(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 assignment_id uuid NOT NULL REFERENCES public.clinician_patient_assignments(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 lineage_id uuid NOT NULL, predecessor_id uuid UNIQUE,
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(encounter_id,patient_id) REFERENCES public.clinical_encounters(id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(author_clinician_id,author_user_id) REFERENCES public.clinician_profiles(id,user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 UNIQUE(id,patient_id), UNIQUE(id,lineage_id,patient_id), UNIQUE(id,consultation_id,patient_id,author_user_id),
 FOREIGN KEY(lineage_id,patient_id) REFERENCES public.prescriptions(id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(predecessor_id,lineage_id,patient_id) REFERENCES public.prescriptions(id,lineage_id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CHECK((predecessor_id IS NULL)=(lineage_id=id)), CHECK(predecessor_id IS DISTINCT FROM id)
);
CREATE TABLE public.prescription_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), root_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 medication_display text NOT NULL CHECK(length(btrim(medication_display))>0 AND public.i2_document_text(medication_display,200)),
 quantity numeric(12,3) NOT NULL CHECK(quantity>0 AND quantity<1000000000 AND quantity<>'NaN'::numeric),
 unit text NOT NULL CHECK(length(btrim(unit))>0 AND public.i2_document_text(unit,40)),
 instructions text NOT NULL CHECK(length(btrim(instructions))>0 AND public.i2_document_text(instructions,2000)),
 UNIQUE(id,root_id)
);
CREATE TABLE public.prescription_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), root_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 version integer NOT NULL CHECK(version>0), command varchar(12) NOT NULL CHECK(command IN ('DRAFT','EDIT','SIGN','CANCEL','REPLACE')),
 state varchar(12) NOT NULL CHECK(state IN ('DRAFT','SIGNED','CANCELLED','REPLACED')),
 valid_from timestamptz(3) NOT NULL, valid_until timestamptz(3) NOT NULL CHECK(valid_until>valid_from),
 assignment_id uuid NOT NULL REFERENCES public.clinician_patient_assignments(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 signed_at timestamptz(3), recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 reason text CHECK(length(btrim(reason))>0 AND public.i2_document_text(reason,1000)),
 replacement_id uuid, operation_id uuid NOT NULL,
 UNIQUE(root_id,version), UNIQUE(id,root_id), UNIQUE(operation_id,root_id),
 FOREIGN KEY(replacement_id) REFERENCES public.prescriptions(id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 CHECK((state='REPLACED')=(replacement_id IS NOT NULL)),
 CHECK((command IN ('CANCEL','REPLACE'))=(reason IS NOT NULL)),
 CHECK((state='DRAFT')=(signed_at IS NULL)),
 CHECK((command IN ('DRAFT','EDIT') AND state='DRAFT') OR (command='SIGN' AND state='SIGNED') OR (command='CANCEL' AND state='CANCELLED') OR (command='REPLACE' AND state IN ('SIGNED','REPLACED')))
);
CREATE TABLE public.prescription_version_items (
 version_id uuid NOT NULL, root_id uuid NOT NULL, item_id uuid NOT NULL, position integer NOT NULL CHECK(position BETWEEN 1 AND 20),
 PRIMARY KEY(version_id,position), UNIQUE(version_id,item_id),
 FOREIGN KEY(version_id,root_id) REFERENCES public.prescription_versions(id,root_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(item_id,root_id) REFERENCES public.prescription_items(id,root_id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE TABLE public.prescription_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 command varchar(12) NOT NULL CHECK(command IN ('DRAFT','EDIT','SIGN','CANCEL','REPLACE','PRIVACY')),
 operation_key uuid NOT NULL CHECK(operation_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
 fingerprint varchar(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 target_root_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 result_root_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 result_version_id uuid, audit_id uuid NOT NULL UNIQUE REFERENCES public.audit_logs(id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), UNIQUE(actor_user_id,command,operation_key),
 UNIQUE(id,actor_user_id), FOREIGN KEY(result_version_id,result_root_id) REFERENCES public.prescription_versions(id,root_id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 CHECK((command='PRIVACY')=(result_version_id IS NULL)), CHECK(command='REPLACE' OR target_root_id=result_root_id)
);
ALTER TABLE public.prescription_versions ADD FOREIGN KEY(operation_id,actor_user_id) REFERENCES public.prescription_operations(id,actor_user_id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE public.prescription_privacy_restrictions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lineage_id uuid NOT NULL UNIQUE, patient_id uuid NOT NULL,
 target_root_id uuid NOT NULL, actor_user_id uuid NOT NULL, operation_id uuid NOT NULL UNIQUE,
 assignment_id uuid NOT NULL REFERENCES public.clinician_patient_assignments(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 reason text NOT NULL CHECK(length(btrim(reason))>0 AND public.i2_document_text(reason,1000)),
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(target_root_id,lineage_id,patient_id) REFERENCES public.prescriptions(id,lineage_id,patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(operation_id,actor_user_id) REFERENCES public.prescription_operations(id,actor_user_id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE public.medication_operations (
 id uuid PRIMARY KEY, actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 operation_key uuid NOT NULL CHECK(operation_key::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'), fingerprint varchar(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 result_version_id uuid NOT NULL UNIQUE REFERENCES public.medication_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 audit_id uuid NOT NULL UNIQUE REFERENCES public.audit_logs(id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), UNIQUE(actor_user_id,operation_key), UNIQUE(id,actor_user_id)
);
ALTER TABLE public.medication_versions ADD FOREIGN KEY(operation_id,actor_user_id) REFERENCES public.medication_operations(id,actor_user_id) ON DELETE RESTRICT ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX prescription_patient_projection ON public.prescriptions(patient_id,created_at DESC,id);
CREATE INDEX prescription_consultation_projection ON public.prescriptions(consultation_id,created_at DESC,id);
CREATE INDEX prescription_lineage ON public.prescriptions(lineage_id,id);
CREATE FUNCTION public.i3_root_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.consultations c JOIN public.clinician_patient_assignments g ON g.id=NEW.assignment_id AND g.patient_id=c.patient_id AND g.clinician_id=c.treating_clinician_id WHERE c.id=NEW.consultation_id AND c.patient_id=NEW.patient_id AND c.encounter_id=NEW.encounter_id AND c.treating_clinician_id=NEW.author_clinician_id AND c.treating_clinician_user_id=NEW.author_user_id AND c.organization_id=NEW.organization_id AND c.membership_id=NEW.membership_id AND (NEW.predecessor_id IS NOT NULL OR c.state='OPEN')) THEN RAISE EXCEPTION 'Invalid prescription provenance' USING ERRCODE='23514'; END IF;
 IF NEW.predecessor_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.prescriptions p WHERE p.id=NEW.predecessor_id AND p.consultation_id=NEW.consultation_id AND p.patient_id=NEW.patient_id AND p.author_user_id=NEW.author_user_id AND p.lineage_id=NEW.lineage_id) THEN RAISE EXCEPTION 'Invalid replacement lineage' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM public.prescription_privacy_restrictions WHERE lineage_id=NEW.lineage_id) THEN RAISE EXCEPTION 'Restricted prescription' USING ERRCODE='23514'; END IF;
 NEW.created_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER prescription_insert BEFORE INSERT ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.i3_root_insert();
CREATE FUNCTION public.i3_version_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE prior public.prescription_versions; root public.prescriptions; stamp timestamptz(3);
BEGIN
 SELECT * INTO root FROM public.prescriptions WHERE id=NEW.root_id FOR UPDATE;
 SELECT * INTO prior FROM public.prescription_versions WHERE root_id=NEW.root_id ORDER BY version DESC LIMIT 1;
 IF NOT EXISTS(SELECT 1 FROM public.clinician_patient_assignments g WHERE g.id=NEW.assignment_id AND g.clinician_id=root.author_clinician_id AND g.patient_id=root.patient_id) THEN RAISE EXCEPTION 'Invalid assignment provenance' USING ERRCODE='23514'; END IF;
 IF NEW.actor_user_id<>root.author_user_id OR EXISTS(SELECT 1 FROM public.prescription_privacy_restrictions WHERE lineage_id=root.lineage_id) THEN RAISE EXCEPTION 'Invalid source actor' USING ERRCODE='23514'; END IF;
 IF prior.id IS NULL THEN
  IF NEW.version<>1 OR NOT ((root.predecessor_id IS NULL AND NEW.command='DRAFT') OR (root.predecessor_id IS NOT NULL AND NEW.command='REPLACE' AND NEW.state='SIGNED')) THEN RAISE EXCEPTION 'Invalid initial source' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW.version<>prior.version+1 OR NOT ((prior.state='DRAFT' AND NEW.command IN ('EDIT','SIGN')) OR (prior.state='SIGNED' AND NEW.command IN ('CANCEL','REPLACE') AND NEW.state IN ('CANCELLED','REPLACED'))) THEN RAISE EXCEPTION 'Invalid source transition' USING ERRCODE='23514'; END IF;
  IF NEW.command<>'EDIT' AND ROW(NEW.valid_from,NEW.valid_until) IS DISTINCT FROM ROW(prior.valid_from,prior.valid_until) THEN RAISE EXCEPTION 'Changed frozen validity' USING ERRCODE='23514'; END IF;
 END IF;
 stamp:=clock_timestamp(); NEW.recorded_at:=stamp;
 NEW.signed_at:=CASE WHEN NEW.state='DRAFT' THEN NULL WHEN NEW.command='SIGN' OR prior.id IS NULL THEN stamp ELSE prior.signed_at END;
 IF NEW.state='SIGNED' AND NEW.valid_until<=stamp THEN RAISE EXCEPTION 'Expired signing interval' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prescription_version_insert BEFORE INSERT ON public.prescription_versions FOR EACH ROW EXECUTE FUNCTION public.i3_version_insert();
CREATE FUNCTION public.i3_item_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 PERFORM id FROM public.prescriptions WHERE id=NEW.root_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.prescription_versions WHERE root_id=NEW.root_id AND state<>'DRAFT') THEN RAISE EXCEPTION 'Frozen items' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prescription_item_insert BEFORE INSERT ON public.prescription_items FOR EACH ROW EXECUTE FUNCTION public.i3_item_insert();
CREATE FUNCTION public.i3_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v public.prescription_versions; prior public.prescription_versions; op public.prescription_operations; r public.prescriptions;
BEGIN
 IF TG_TABLE_NAME='prescriptions' THEN
  IF NOT EXISTS(SELECT 1 FROM public.prescription_versions WHERE root_id=NEW.id AND version=1) THEN RAISE EXCEPTION 'Missing initial version' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='prescription_items' THEN
  IF NOT EXISTS(SELECT 1 FROM public.prescription_version_items WHERE item_id=NEW.id) THEN RAISE EXCEPTION 'Unbound item' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='prescription_versions' THEN
  v:=NEW;
  IF NOT EXISTS(SELECT 1 FROM public.prescription_version_items WHERE version_id=v.id) THEN RAISE EXCEPTION 'Empty prescription' USING ERRCODE='23514'; END IF;
  SELECT * INTO prior FROM public.prescription_versions WHERE root_id=v.root_id AND version=v.version-1;
  IF prior.id IS NOT NULL AND v.command<>'EDIT' AND (SELECT array_agg(item_id ORDER BY position) FROM public.prescription_version_items WHERE version_id=v.id) IS DISTINCT FROM (SELECT array_agg(item_id ORDER BY position) FROM public.prescription_version_items WHERE version_id=prior.id) THEN RAISE EXCEPTION 'Changed frozen items' USING ERRCODE='23514'; END IF;
  SELECT * INTO op FROM public.prescription_operations WHERE id=v.operation_id;
  IF op.id IS NULL OR op.command<>v.command OR v.root_id NOT IN (op.target_root_id,op.result_root_id) OR op.actor_user_id<>v.actor_user_id THEN RAISE EXCEPTION 'Invalid version operation' USING ERRCODE='23514'; END IF;
  IF v.state='SIGNED' AND v.valid_until<=clock_timestamp() THEN RAISE EXCEPTION 'Expired signing interval' USING ERRCODE='23514'; END IF;
  IF v.state='SIGNED' AND EXISTS(SELECT 1 FROM public.prescription_version_items vi JOIN public.prescription_items i ON i.id=vi.item_id JOIN LATERAL (SELECT * FROM public.medication_versions WHERE medication_id=i.medication_id ORDER BY version DESC LIMIT 1) m ON true WHERE vi.version_id=v.id AND (NOT m.is_active OR NOT m.is_published OR m.display_name<>i.medication_display)) THEN RAISE EXCEPTION 'Medication unavailable' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='prescription_operations' THEN
  op:=NEW; SELECT * INTO r FROM public.prescriptions WHERE id=op.target_root_id;
  IF r.author_user_id<>op.actor_user_id OR NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE id=op.audit_id AND actor_user_id=op.actor_user_id AND entity_type='prescription' AND entity_id=op.target_root_id AND action_type='PRESCRIPTION_'||op.command AND safe_metadata='{}'::jsonb) THEN RAISE EXCEPTION 'Missing atomic audit' USING ERRCODE='23514'; END IF;
  IF op.command='PRIVACY' THEN
   IF NOT EXISTS(SELECT 1 FROM public.prescription_privacy_restrictions WHERE operation_id=op.id AND target_root_id=op.target_root_id AND actor_user_id=op.actor_user_id) THEN RAISE EXCEPTION 'Missing privacy restriction' USING ERRCODE='23514'; END IF;
  ELSE
   IF NOT EXISTS(SELECT 1 FROM public.prescription_versions WHERE id=op.result_version_id AND root_id=op.result_root_id AND operation_id=op.id AND command=op.command) THEN RAISE EXCEPTION 'Missing result' USING ERRCODE='23514'; END IF;
   IF op.command='REPLACE' AND NOT EXISTS(SELECT 1 FROM public.prescriptions n JOIN public.prescription_versions prev ON prev.root_id=op.target_root_id AND prev.operation_id=op.id AND prev.state='REPLACED' AND prev.replacement_id=n.id JOIN public.prescription_versions fresh ON fresh.id=op.result_version_id AND fresh.root_id=n.id AND fresh.state='SIGNED' AND fresh.reason=prev.reason WHERE n.id=op.result_root_id AND n.predecessor_id=op.target_root_id AND n.lineage_id=r.lineage_id AND n.patient_id=r.patient_id) THEN RAISE EXCEPTION 'Incomplete replacement' USING ERRCODE='23514'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME='prescription_privacy_restrictions' THEN
  IF NOT EXISTS(SELECT 1 FROM public.prescriptions source_root JOIN public.prescription_operations source_op ON source_op.id=NEW.operation_id AND source_op.command='PRIVACY' AND source_op.target_root_id=source_root.id AND source_op.actor_user_id=NEW.actor_user_id JOIN public.clinician_patient_assignments source_grant ON source_grant.id=NEW.assignment_id AND source_grant.patient_id=source_root.patient_id AND source_grant.clinician_id=source_root.author_clinician_id WHERE source_root.id=NEW.target_root_id AND source_root.author_user_id=NEW.actor_user_id) THEN RAISE EXCEPTION 'Invalid privacy actor' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION public.i3_catalog_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE head integer;
BEGIN
 PERFORM id FROM public.medications WHERE id=NEW.medication_id FOR UPDATE;
 SELECT max(version) INTO head FROM public.medication_versions WHERE medication_id=NEW.medication_id;
 IF NEW.version<>coalesce(head,0)+1 THEN RAISE EXCEPTION 'Invalid catalog version' USING ERRCODE='23514'; END IF;
 NEW.recorded_at:=clock_timestamp(); RETURN NEW;
END $$;
CREATE TRIGGER medication_version_insert BEFORE INSERT ON public.medication_versions FOR EACH ROW EXECUTE FUNCTION public.i3_catalog_insert();
CREATE FUNCTION public.i3_catalog_complete() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.medication_versions v JOIN public.users u ON u.id=NEW.actor_user_id AND u.role='ADMIN' JOIN public.audit_logs a ON a.id=NEW.audit_id AND a.actor_user_id=u.id AND a.entity_type='medication' AND a.entity_id=NEW.medication_id AND a.action_type='MEDICATION_SET' AND a.safe_metadata='{}'::jsonb WHERE v.id=NEW.result_version_id AND v.medication_id=NEW.medication_id AND v.operation_id=NEW.id AND v.actor_user_id=u.id) THEN RAISE EXCEPTION 'Missing catalog result or audit' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER medication_operation_complete AFTER INSERT ON public.medication_operations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i3_catalog_complete();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['prescriptions','prescription_items','prescription_versions','prescription_operations','prescription_privacy_restrictions'] LOOP
  EXECUTE format('CREATE CONSTRAINT TRIGGER i3_complete AFTER INSERT ON public.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.i3_complete()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['medications','medication_versions','medication_operations','prescriptions','prescription_items','prescription_versions','prescription_version_items','prescription_operations','prescription_privacy_restrictions'] LOOP
  EXECUTE format('CREATE TRIGGER i3_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.i2_immutable()',t);
 END LOOP;
END $$;

-- Links may only be attached to a version created in this transaction; later
-- INSERTs cannot alter an already committed signed snapshot or historical draft.
CREATE FUNCTION public.i3_version_item_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.prescription_versions v WHERE v.id=NEW.version_id AND v.root_id=NEW.root_id AND v.xmin=((pg_current_xact_id()::text::numeric % 4294967296)::text)::xid) THEN RAISE EXCEPTION 'Immutable version items' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prescription_version_item_insert BEFORE INSERT ON public.prescription_version_items FOR EACH ROW EXECUTE FUNCTION public.i3_version_item_insert();

CREATE FUNCTION public.i3_recorded_time() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN NEW.recorded_at:=clock_timestamp();RETURN NEW;END $$;
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['prescription_operations','prescription_privacy_restrictions','medication_operations'] LOOP
  EXECUTE format('CREATE TRIGGER i3_recorded_time BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.i3_recorded_time()',t);
 END LOOP;
END $$;
