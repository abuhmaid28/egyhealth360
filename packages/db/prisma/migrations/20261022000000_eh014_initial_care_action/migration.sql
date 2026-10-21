BEGIN;
ALTER TABLE public.care_plans ADD CONSTRAINT care_plans_action_scope_key UNIQUE(id,patient_id,template_id,rule_definition_id);
ALTER TABLE public.observed_applicability_snapshots ADD CONSTRAINT oa_action_scope_key UNIQUE(id,patient_id);

-- UTC proleptic Gregorian arithmetic, independently applied to the original trigger.
CREATE FUNCTION public.eh014_add_months(t timestamptz, months integer) RETURNS timestamptz
LANGUAGE plpgsql IMMUTABLE STRICT SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE u timestamp; first_day date; last_day integer; result timestamp;
BEGIN
 IF NOT pg_catalog.isfinite(t) OR t < TIMESTAMPTZ '0001-01-01Z' OR t >= TIMESTAMPTZ '10000-01-01Z'
   OR t <> pg_catalog.date_trunc('milliseconds',t) OR months NOT IN (3,6) THEN
   RAISE EXCEPTION 'Unsupported calendar input' USING ERRCODE='23514'; END IF;
 u:=t AT TIME ZONE 'UTC';
 first_day:=(pg_catalog.date_trunc('month',u)+pg_catalog.make_interval(months=>months))::date;
 IF EXTRACT(year FROM first_day) NOT BETWEEN 1 AND 9999 THEN
   RAISE EXCEPTION 'Calendar overflow' USING ERRCODE='23514'; END IF;
 last_day:=EXTRACT(day FROM first_day + INTERVAL '1 month - 1 day');
 result:=first_day + (LEAST(EXTRACT(day FROM u)::integer,last_day)-1) + u::time;
 RETURN result AT TIME ZONE 'UTC';
END $$;

-- Protected, fixed-shape source material. Never exported as an ordinary action projection.
CREATE FUNCTION public.eh014_inputs(plan uuid, bp uuid, applicability uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp SET timezone='UTC' AS $$
 SELECT pg_catalog.jsonb_build_object(
   'version','eh014-initial-v1','plan',pg_catalog.to_jsonb(p),
   'template',pg_catalog.to_jsonb(t),'rule',pg_catalog.to_jsonb(r),'source',pg_catalog.to_jsonb(g),
   'bp',pg_catalog.to_jsonb(b),'selectedApplicabilityId',s.id,
   'point',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(x) ORDER BY x.id)
      FROM public.observed_applicability_snapshots x WHERE x.patient_id=p.patient_id AND x.effective_at=b.measured_at
      AND NOT EXISTS(SELECT 1 FROM public.observed_applicability_retractions w WHERE w.snapshot_id=x.id)),'[]'::jsonb),
   'withdrawals',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(w) ORDER BY w.id)
      FROM public.observed_applicability_snapshots x JOIN public.observed_applicability_retractions w ON w.snapshot_id=x.id
      WHERE x.patient_id=p.patient_id AND x.effective_at=b.measured_at),'[]'::jsonb),
   'bpOrigin',COALESCE((SELECT pg_catalog.to_jsonb(o) FROM public.bp_amendment_operations o WHERE o.new_bp_id=b.id),'null'::jsonb),
   'effective',public.bp31_effective(b.id),'disclosable',public.bp31_disclosable(b.id),
   'thresholdSatisfied',b.systolic<140 AND b.diastolic<90,'encounterInput',NULL,
   'calendarVersion','utc-gregorian-clamp-v1','tupleComparison',
   (SELECT CASE WHEN count(*)=0 THEN 'NO_NON_RETRACTED_ROWS'
     WHEN count(DISTINCT pg_catalog.jsonb_build_array(x.age_assertion_state,x.age_years_at_assessment,x.pregnancy_status,x.hypertension_status,x.cvd_status,x.diabetes_status,x.ckd_status))=1 THEN 'IDENTICAL_TUPLES' ELSE 'DIFFERING_TUPLES' END
    FROM public.observed_applicability_snapshots x WHERE x.patient_id=p.patient_id AND x.effective_at=b.measured_at
    AND NOT EXISTS(SELECT 1 FROM public.observed_applicability_retractions w WHERE w.snapshot_id=x.id)))
 FROM public.care_plans p JOIN public.care_plan_templates t ON t.id=p.template_id
 JOIN public.care_rule_definitions r ON r.id=p.rule_definition_id AND r.template_id=t.id
 JOIN public.guideline_sources g ON g.id=t.guideline_source_id
 JOIN public.blood_pressure_measurements b ON b.id=bp AND b.patient_id=p.patient_id
 JOIN public.observed_applicability_snapshots s ON s.id=applicability AND s.patient_id=p.patient_id
 WHERE p.id=plan
$$;

-- Consume replacement provenance coherently without inheriting predecessor privacy or selecting a successor.
CREATE FUNCTION public.eh014_bp_linkage(bp uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.blood_pressure_measurements WHERE id=bp)
 AND NOT EXISTS(SELECT 1 FROM public.bp_amendment_operations o JOIN public.blood_pressure_measurements b ON b.id=o.new_bp_id
 WHERE b.id=bp AND (o.patient_id<>b.patient_id OR o.kind NOT IN ('CORRECT','RESTATE')
 OR ROW(o.systolic,o.diastolic,o.measured_at) IS DISTINCT FROM ROW(b.systolic,b.diastolic,b.measured_at)
 OR b.source_kind<>'CLINICIAN_ENTRY' OR b.recorded_by_user_id<>o.actor_user_id
 OR NOT EXISTS(SELECT 1 FROM public.bp_exclusions e WHERE e.bp_id=o.target_bp_id AND e.patient_id=o.patient_id
 AND (o.kind='RESTATE' OR (e.operation_id=o.id AND e.reason_code=o.reason_code)))))
$$;

CREATE TABLE public.care_action_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 action_id uuid NOT NULL UNIQUE,
 patient_id uuid NOT NULL,
 care_plan_id uuid NOT NULL,
 template_id uuid NOT NULL,
 rule_definition_id uuid NOT NULL,
 bp_id uuid NOT NULL,
 applicability_id uuid NOT NULL,
 selecting_user_id uuid NOT NULL REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 assignment_id uuid NOT NULL REFERENCES public.clinician_patient_assignments(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 operation_key uuid NOT NULL,
 accepted boolean NOT NULL CHECK(accepted),
 selector_provenance jsonb NOT NULL,
 inputs jsonb NOT NULL,
 trigger_at timestamptz(6) NOT NULL,
 recommended_at timestamptz(6) NOT NULL,
 due_by timestamptz(6) NOT NULL,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 creation_xid xid8 NOT NULL DEFAULT pg_catalog.pg_current_xact_id(),
 CONSTRAINT care_decision_occurrence_key UNIQUE(care_plan_id,rule_definition_id),
 CONSTRAINT care_decision_operation_key UNIQUE(selecting_user_id,operation_key),
 CONSTRAINT care_decision_scope_key UNIQUE(id,patient_id),
 CONSTRAINT care_decision_pair_key UNIQUE(action_id,id,patient_id),
 CONSTRAINT care_decision_plan_fk FOREIGN KEY(care_plan_id,patient_id,template_id,rule_definition_id)
 REFERENCES public.care_plans(id,patient_id,template_id,rule_definition_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT care_decision_bp_fk FOREIGN KEY(bp_id,patient_id) REFERENCES public.blood_pressure_measurements(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT care_decision_app_fk FOREIGN KEY(applicability_id,patient_id) REFERENCES public.observed_applicability_snapshots(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT care_decision_calendar CHECK(recommended_at=public.eh014_add_months(trigger_at,3) AND due_by=public.eh014_add_months(trigger_at,6))
);
CREATE TABLE public.care_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 patient_id uuid NOT NULL,
 care_plan_id uuid NOT NULL,
 template_id uuid NOT NULL,
 rule_definition_id uuid NOT NULL,
 decision_id uuid NOT NULL UNIQUE,
 occurrence text NOT NULL CHECK(occurrence='INITIAL'),
 action_type text NOT NULL CHECK(action_type='HTN_BP_FOLLOWUP'),
 trigger_at timestamptz(6) NOT NULL,
 recommended_at timestamptz(6) NOT NULL,
 due_by timestamptz(6) NOT NULL,
 created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT care_actions_occurrence_key UNIQUE(care_plan_id,rule_definition_id,occurrence),
 CONSTRAINT care_actions_pair_key UNIQUE(id,decision_id,patient_id),
 CONSTRAINT care_actions_decision_fk FOREIGN KEY(id,decision_id,patient_id) REFERENCES public.care_action_decisions(action_id,id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT care_actions_plan_fk FOREIGN KEY(care_plan_id,patient_id,template_id,rule_definition_id) REFERENCES public.care_plans(id,patient_id,template_id,rule_definition_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);
ALTER TABLE public.care_action_decisions ADD CONSTRAINT care_decision_action_fk
 FOREIGN KEY(action_id,id,patient_id) REFERENCES public.care_actions(id,decision_id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE public.care_action_applicability_inputs (
 decision_id uuid NOT NULL,
 snapshot_id uuid NOT NULL,
 patient_id uuid NOT NULL,
 PRIMARY KEY(decision_id,snapshot_id),
 FOREIGN KEY(decision_id,patient_id) REFERENCES public.care_action_decisions(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(snapshot_id,patient_id) REFERENCES public.observed_applicability_snapshots(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE INDEX care_actions_history_idx ON public.care_actions(patient_id,created_at DESC,id DESC);
CREATE INDEX care_decision_bp_idx ON public.care_action_decisions(bp_id,patient_id);
CREATE INDEX care_decision_app_idx ON public.care_action_decisions(applicability_id,patient_id);
CREATE INDEX care_decision_assignment_idx ON public.care_action_decisions(assignment_id);
CREATE INDEX care_input_snapshot_idx ON public.care_action_applicability_inputs(snapshot_id,patient_id);

CREATE FUNCTION public.eh014_guard_decision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE p public.care_plans%ROWTYPE; t public.care_plan_templates%ROWTYPE;
 b public.blood_pressure_measurements%ROWTYPE; s public.observed_applicability_snapshots%ROWTYPE; current_inputs jsonb;
BEGIN
 -- Same canonical authority/scope order as clinical writers; structural provenance, not session authentication.
 PERFORM id FROM public.users WHERE id=NEW.selecting_user_id AND role='CLINICIAN' AND status='ACTIVE' FOR NO KEY UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid selector' USING ERRCODE='23514'; END IF;
 PERFORM id FROM public.clinician_profiles WHERE user_id=NEW.selecting_user_id AND user_role='CLINICIAN' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid selector' USING ERRCODE='23514'; END IF;
 PERFORM a.id FROM public.clinician_patient_assignments a JOIN public.clinician_profiles c ON c.id=a.clinician_id
 WHERE c.user_id=NEW.selecting_user_id AND a.id=NEW.assignment_id AND a.patient_id=NEW.patient_id AND a.status='ACTIVE' AND a.ended_at IS NULL FOR SHARE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid selector' USING ERRCODE='23514'; END IF;
 PERFORM id FROM public.patient_profiles WHERE id=NEW.patient_id FOR UPDATE;
 SELECT * INTO p FROM public.care_plans WHERE id=NEW.care_plan_id AND patient_id=NEW.patient_id FOR UPDATE;
 SELECT * INTO t FROM public.care_plan_templates WHERE id=p.template_id FOR SHARE;
 IF p.status IS DISTINCT FROM 'ACTIVE' OR t.status IS DISTINCT FROM 'PUBLISHED'
 OR NEW.template_id IS DISTINCT FROM p.template_id OR NEW.rule_definition_id IS DISTINCT FROM p.rule_definition_id
 OR NOT EXISTS(SELECT 1 FROM public.care_rule_definitions r WHERE r.id=p.rule_definition_id AND r.template_id=t.id
  AND r.rule_key='CR-HTN-FU-001' AND r.rule_version='1.0.0-draft' AND r.action_type='HTN_BP_FOLLOWUP' AND public.eh009_is_htn_fu_v1(r.definition)) THEN
 RAISE EXCEPTION 'Unavailable action definition' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.clinician_patient_assignments a JOIN public.clinician_profiles c ON c.id=a.clinician_id
 WHERE a.id=NEW.assignment_id AND a.patient_id=p.patient_id AND c.user_id=NEW.selecting_user_id AND a.status='ACTIVE' AND a.ended_at IS NULL) THEN
 RAISE EXCEPTION 'Invalid selector' USING ERRCODE='23514'; END IF;
 SELECT * INTO b FROM public.blood_pressure_measurements WHERE id=NEW.bp_id AND patient_id=p.patient_id FOR UPDATE;
 SELECT * INTO s FROM public.observed_applicability_snapshots WHERE id=NEW.applicability_id AND patient_id=p.patient_id;
 IF b.id IS NULL OR s.id IS NULL OR NOT public.bp31_effective(b.id) OR NOT public.bp31_disclosable(b.id)
 OR NOT public.eh014_bp_linkage(b.id) OR b.systolic>=140 OR b.diastolic>=90 OR b.measured_at<p.started_at OR s.effective_at<>b.measured_at
 OR s.age_assertion_state IS DISTINCT FROM 'ASSERTED_VALUE' OR s.age_years_at_assessment IS NULL OR s.age_years_at_assessment<18
 OR s.pregnancy_status IS DISTINCT FROM 'NOT_PREGNANT' OR s.hypertension_status IS DISTINCT FROM 'PRESENT'
 OR s.cvd_status IS DISTINCT FROM 'ABSENT' OR s.diabetes_status IS DISTINCT FROM 'ABSENT' OR s.ckd_status IS DISTINCT FROM 'ABSENT'
 OR EXISTS(SELECT 1 FROM public.observed_applicability_retractions WHERE snapshot_id=s.id) THEN
 RAISE EXCEPTION 'Selected inputs unavailable' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM public.observed_applicability_snapshots x WHERE x.patient_id=p.patient_id AND x.effective_at=b.measured_at
 AND NOT EXISTS(SELECT 1 FROM public.observed_applicability_retractions w WHERE w.snapshot_id=x.id)
 AND ROW(x.age_assertion_state,x.age_years_at_assessment,x.pregnancy_status,x.hypertension_status,x.cvd_status,x.diabetes_status,x.ckd_status)
 IS DISTINCT FROM ROW(s.age_assertion_state,s.age_years_at_assessment,s.pregnancy_status,s.hypertension_status,s.cvd_status,s.diabetes_status,s.ckd_status)) THEN
 RAISE EXCEPTION 'Conflicting applicability' USING ERRCODE='23514'; END IF;
 current_inputs:=public.eh014_inputs(p.id,b.id,s.id);
 IF NEW.inputs IS DISTINCT FROM current_inputs THEN RAISE EXCEPTION 'Stale selection' USING ERRCODE='23514'; END IF;
 SELECT pg_catalog.jsonb_build_object('clinician',pg_catalog.to_jsonb(c),'assignment',pg_catalog.to_jsonb(a)) INTO NEW.selector_provenance
 FROM public.clinician_patient_assignments a JOIN public.clinician_profiles c ON c.id=a.clinician_id
 WHERE a.id=NEW.assignment_id AND c.user_id=NEW.selecting_user_id;
 NEW.trigger_at:=b.measured_at; NEW.recommended_at:=public.eh014_add_months(b.measured_at,3); NEW.due_by:=public.eh014_add_months(b.measured_at,6);
 NEW.created_at:=pg_catalog.clock_timestamp()::timestamptz(3); NEW.creation_xid:=pg_catalog.pg_current_xact_id();
 RETURN NEW;
END $$;
CREATE FUNCTION public.eh014_guard_action() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE d public.care_action_decisions%ROWTYPE;
BEGIN
 SELECT * INTO d FROM public.care_action_decisions WHERE id=NEW.decision_id;
 IF d.id IS NULL OR d.creation_xid<>pg_catalog.pg_current_xact_id()
 OR ROW(NEW.id,NEW.patient_id,NEW.care_plan_id,NEW.template_id,NEW.rule_definition_id) IS DISTINCT FROM ROW(d.action_id,d.patient_id,d.care_plan_id,d.template_id,d.rule_definition_id) THEN
 RAISE EXCEPTION 'Invalid action ownership' USING ERRCODE='23514'; END IF;
 NEW.trigger_at:=d.trigger_at; NEW.recommended_at:=d.recommended_at; NEW.due_by:=d.due_by; NEW.created_at:=d.created_at;
 RETURN NEW;
END $$;
CREATE FUNCTION public.eh014_guard_member() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.care_action_decisions d WHERE d.id=NEW.decision_id AND d.patient_id=NEW.patient_id
 AND d.creation_xid=pg_catalog.pg_current_xact_id() AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(d.inputs->'point') x WHERE (x->>'id')::uuid=NEW.snapshot_id)) THEN
 RAISE EXCEPTION 'Invalid decision membership' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.eh014_complete() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF (SELECT count(*) FROM public.care_action_applicability_inputs WHERE decision_id=NEW.id) <> pg_catalog.jsonb_array_length(NEW.inputs->'point')
 OR (SELECT count(*) FROM public.audit_logs WHERE entity_id=NEW.id AND entity_type='care_action_decision' AND action_type='CARE_ACTION_TRIGGER_SELECTED' AND actor_user_id=NEW.selecting_user_id AND safe_metadata='{}'::jsonb)<>1
 OR (SELECT count(*) FROM public.audit_logs WHERE entity_id=NEW.action_id AND entity_type='care_action' AND action_type='CARE_ACTION_CREATED' AND actor_user_id IS NULL AND safe_metadata='{}'::jsonb)<>1 THEN
 RAISE EXCEPTION 'Incomplete decision or audit' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION public.eh014_immutable() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'Care action history is immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER care_decision_insert BEFORE INSERT ON public.care_action_decisions FOR EACH ROW EXECUTE FUNCTION public.eh014_guard_decision();
CREATE TRIGGER care_action_insert BEFORE INSERT ON public.care_actions FOR EACH ROW EXECUTE FUNCTION public.eh014_guard_action();
CREATE TRIGGER care_input_insert BEFORE INSERT ON public.care_action_applicability_inputs FOR EACH ROW EXECUTE FUNCTION public.eh014_guard_member();
CREATE CONSTRAINT TRIGGER care_decision_complete AFTER INSERT ON public.care_action_decisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.eh014_complete();
CREATE TRIGGER care_decision_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.care_action_decisions FOR EACH STATEMENT EXECUTE FUNCTION public.eh014_immutable();
CREATE TRIGGER care_action_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.care_actions FOR EACH STATEMENT EXECUTE FUNCTION public.eh014_immutable();
CREATE TRIGGER care_input_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.care_action_applicability_inputs FOR EACH STATEMENT EXECUTE FUNCTION public.eh014_immutable();
CREATE FUNCTION public.eh014_coherent(action uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp SET timezone='UTC' AS $$
 SELECT COALESCE((SELECT
 ROW(a.id,a.patient_id,a.care_plan_id,a.template_id,a.rule_definition_id,a.trigger_at,a.recommended_at,a.due_by,a.created_at)
 IS NOT DISTINCT FROM ROW(d.action_id,d.patient_id,d.care_plan_id,d.template_id,d.rule_definition_id,d.trigger_at,d.recommended_at,d.due_by,d.created_at)
 AND d.inputs->'bp'=pg_catalog.to_jsonb(b)
 AND d.inputs->>'selectedApplicabilityId'=d.applicability_id::text
 AND public.eh014_bp_linkage(b.id)
 AND d.inputs->'bpOrigin'=COALESCE((SELECT pg_catalog.to_jsonb(o) FROM public.bp_amendment_operations o WHERE o.new_bp_id=b.id),'null'::jsonb)
 AND (d.inputs->'plan'->>'id')::uuid=d.care_plan_id
 AND (d.inputs->'plan'->>'patient_id')::uuid=d.patient_id
 AND (SELECT count(*) FROM public.care_action_applicability_inputs m WHERE m.decision_id=d.id)=pg_catalog.jsonb_array_length(d.inputs->'point')
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(d.inputs->'point') x
   WHERE NOT EXISTS(SELECT 1 FROM public.care_action_applicability_inputs m JOIN public.observed_applicability_snapshots s ON s.id=m.snapshot_id AND s.patient_id=m.patient_id
   WHERE m.decision_id=d.id AND m.patient_id=d.patient_id AND pg_catalog.to_jsonb(s)=x))
 FROM public.care_actions a JOIN public.care_action_decisions d ON d.id=a.decision_id
 JOIN public.blood_pressure_measurements b ON b.id=d.bp_id AND b.patient_id=d.patient_id
 WHERE a.id=action),false)
$$;
COMMIT;
