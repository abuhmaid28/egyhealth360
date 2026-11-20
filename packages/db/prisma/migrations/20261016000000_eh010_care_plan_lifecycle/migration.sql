BEGIN;
CREATE TYPE public.care_plan_status AS ENUM ('DRAFT', 'ACTIVE', 'CANCELLED');
ALTER TABLE public.care_rule_definitions ADD CONSTRAINT care_rule_definitions_id_template_key UNIQUE (id, template_id);
CREATE TABLE public.care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  template_id uuid NOT NULL,
  rule_definition_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL,
  status public.care_plan_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at timestamptz(3),
  cancelled_at timestamptz(3),
  CONSTRAINT care_plans_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT care_plans_template_fkey FOREIGN KEY (template_id) REFERENCES public.care_plan_templates(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT care_plans_rule_template_fkey FOREIGN KEY (rule_definition_id, template_id) REFERENCES public.care_rule_definitions(id, template_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT care_plans_creator_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT care_plans_lifecycle_check CHECK (
    (status = 'DRAFT' AND started_at IS NULL AND cancelled_at IS NULL)
    OR (status = 'ACTIVE' AND started_at IS NOT NULL AND started_at >= created_at AND cancelled_at IS NULL)
    OR (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND cancelled_at >= created_at
      AND (started_at IS NULL OR (started_at >= created_at AND cancelled_at >= started_at)))
  )
);
CREATE UNIQUE INDEX care_plans_active_htn_patient_key ON public.care_plans(patient_id) WHERE status = 'ACTIVE';
CREATE INDEX care_plans_patient_history_idx ON public.care_plans(patient_id, created_at);
CREATE INDEX care_plans_template_idx ON public.care_plans(template_id);
CREATE INDEX care_plans_rule_template_idx ON public.care_plans(rule_definition_id, template_id);
CREATE INDEX care_plans_creator_idx ON public.care_plans(created_by_user_id);

CREATE FUNCTION public.eh010_guard_care_plan() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE template public.care_plan_templates%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' OR NEW.started_at IS NOT NULL OR NEW.cancelled_at IS NOT NULL THEN
      RAISE EXCEPTION 'Plan must start as DRAFT' USING ERRCODE='23514', CONSTRAINT='care_plans_write_guard';
    END IF;
    -- Structural provenance only. Authentication belongs to the service transaction.
    IF NOT EXISTS (SELECT 1 FROM public.users u JOIN public.clinician_profiles c ON c.user_id=u.id
      JOIN public.clinician_patient_assignments a ON a.clinician_id=c.id
      WHERE u.id=NEW.created_by_user_id AND u.role='CLINICIAN' AND u.status='ACTIVE'
        AND c.user_role='CLINICIAN' AND a.patient_id=NEW.patient_id AND a.status='ACTIVE' AND a.ended_at IS NULL) THEN
      RAISE EXCEPTION 'Invalid plan creator relationship' USING ERRCODE='23514', CONSTRAINT='care_plans_creator_guard';
    END IF;
    NEW.created_at := clock_timestamp()::timestamptz(3);
  ELSE
    IF NEW IS NOT DISTINCT FROM OLD THEN RETURN OLD; END IF;
    IF ROW(NEW.id,NEW.patient_id,NEW.template_id,NEW.rule_definition_id,NEW.created_by_user_id,NEW.created_at,NEW.started_at,NEW.cancelled_at)
      IS DISTINCT FROM ROW(OLD.id,OLD.patient_id,OLD.template_id,OLD.rule_definition_id,OLD.created_by_user_id,OLD.created_at,OLD.started_at,OLD.cancelled_at) THEN
      RAISE EXCEPTION 'Plan identity and timestamps are immutable' USING ERRCODE='23514', CONSTRAINT='care_plans_write_guard';
    END IF;
    IF NOT ((OLD.status='DRAFT' AND NEW.status IN ('ACTIVE','CANCELLED')) OR (OLD.status='ACTIVE' AND NEW.status='CANCELLED')) THEN
      RAISE EXCEPTION 'Invalid plan transition' USING ERRCODE='23514', CONSTRAINT='care_plans_write_guard';
    END IF;
    IF NEW.status='CANCELLED' THEN
      NEW.cancelled_at := GREATEST(OLD.created_at,OLD.started_at,clock_timestamp()::timestamptz(3));
      RETURN NEW;
    END IF;
  END IF;
  -- SHARE conflicts with retirement's NO KEY UPDATE (KEY SHARE would not).
  SELECT * INTO template FROM public.care_plan_templates WHERE id=NEW.template_id FOR SHARE;
  IF NOT FOUND OR template.status <> 'PUBLISHED' OR template.template_key <> 'CPT-HTN-FU-001'
    OR template.version <> '1.0.0-draft' OR template.condition_domain <> 'HYPERTENSION'
    OR template.name <> 'Controlled uncomplicated hypertension follow-up'
    OR NOT EXISTS (SELECT 1 FROM public.guideline_sources s WHERE s.id=template.guideline_source_id
      AND s.source_key='WHO-HTN-2021' AND s.publisher='World Health Organization'
      AND s.title='Guideline for the pharmacological treatment of hypertension in adults'
      AND s.publication_identity='2021' AND s.publication_year=2021
      AND s.reference_identifier='ISBN:978-92-4-003398-6' AND s.reference_url IS NULL)
    OR (SELECT count(*) FROM public.care_rule_definitions r WHERE r.template_id=template.id) <> 1
    OR NOT EXISTS (SELECT 1 FROM public.care_rule_definitions r WHERE r.id=NEW.rule_definition_id AND r.template_id=template.id
      AND r.rule_key='CR-HTN-FU-001' AND r.rule_version='1.0.0-draft' AND r.action_type='HTN_BP_FOLLOWUP'
      AND public.eh009_is_htn_fu_v1(r.definition)) THEN
    RAISE EXCEPTION 'Plan requires the approved published definition' USING ERRCODE='23514', CONSTRAINT='care_plans_definition_guard';
  END IF;
  IF TG_OP='UPDATE' THEN NEW.started_at := GREATEST(OLD.created_at,clock_timestamp()::timestamptz(3)); END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.eh010_reject_care_plan_removal() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Plan history cannot be removed' USING ERRCODE='23514', CONSTRAINT='care_plans_removal_guard';
END;
$$;
CREATE TRIGGER care_plans_write_guard BEFORE INSERT OR UPDATE ON public.care_plans FOR EACH ROW EXECUTE FUNCTION public.eh010_guard_care_plan();
CREATE TRIGGER care_plans_removal_guard BEFORE DELETE OR TRUNCATE ON public.care_plans FOR EACH STATEMENT EXECUTE FUNCTION public.eh010_reject_care_plan_removal();
COMMIT;
