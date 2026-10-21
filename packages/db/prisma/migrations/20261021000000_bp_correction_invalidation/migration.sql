BEGIN;

-- Issue #31. Source BP rows and all eight historical migrations remain unchanged.
CREATE TABLE public.bp_amendment_operations (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patient_profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('EXCLUDE','CORRECT','RESTATE','PRIVACY')),
  operation_key uuid NOT NULL,
  target_bp_id uuid NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN ('DATA_ENTRY_ERROR','MEASUREMENT_ERROR','DUPLICATE','WRONG_PATIENT','WRONG_CONTEXT','SOURCE_WITHDRAWAL','PROVENANCE_ERROR','CORRECTION_ERROR')),
  duplicate_of_bp_id uuid,
  predecessor_ids uuid[] NOT NULL DEFAULT '{}',
  new_bp_id uuid UNIQUE,
  systolic integer,
  diastolic integer,
  measured_at timestamptz(6),
  asserted_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (actor_user_id,kind,operation_key),
  UNIQUE (id,patient_id),
  UNIQUE (new_bp_id,patient_id),
  FOREIGN KEY (target_bp_id,patient_id) REFERENCES public.blood_pressure_measurements(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (duplicate_of_bp_id,patient_id) REFERENCES public.blood_pressure_measurements(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (new_bp_id,patient_id) REFERENCES public.blood_pressure_measurements(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (new_bp_id IS DISTINCT FROM target_bp_id),
  CHECK (duplicate_of_bp_id IS DISTINCT FROM target_bp_id),
  CHECK (duplicate_of_bp_id IS NULL OR (kind IN ('EXCLUDE','CORRECT') AND reason_code='DUPLICATE')),
  CHECK ((kind IN ('CORRECT','RESTATE') AND new_bp_id IS NOT NULL AND systolic IS NOT NULL AND diastolic IS NOT NULL AND measured_at IS NOT NULL)
    OR (kind IN ('EXCLUDE','PRIVACY') AND new_bp_id IS NULL AND systolic IS NULL AND diastolic IS NULL AND measured_at IS NULL)),
  CHECK (kind<>'CORRECT' OR reason_code<>'WRONG_PATIENT'),
  CHECK (kind<>'RESTATE' OR reason_code='CORRECTION_ERROR'),
  CHECK (kind<>'PRIVACY' OR reason_code='WRONG_PATIENT'),
  CHECK (kind='PRIVACY' OR pg_catalog.cardinality(predecessor_ids)=0),
  CHECK (pg_catalog.cardinality(predecessor_ids)<=99 AND pg_catalog.array_position(predecessor_ids,NULL) IS NULL),
  CHECK (pg_catalog.isfinite(asserted_at) AND asserted_at=recorded_at AND asserted_at >= TIMESTAMPTZ '0001-01-01' AND asserted_at < TIMESTAMPTZ '10000-01-01'),
  CHECK (measured_at IS NULL OR (pg_catalog.isfinite(measured_at) AND measured_at >= TIMESTAMPTZ '0001-01-01' AND measured_at < TIMESTAMPTZ '10000-01-01'
    AND measured_at=pg_catalog.date_trunc('milliseconds',measured_at) AND measured_at<=recorded_at))
);
CREATE UNIQUE INDEX bp_one_restatement_per_target ON public.bp_amendment_operations(target_bp_id) WHERE kind='RESTATE';
CREATE INDEX bp_operations_patient_history ON public.bp_amendment_operations(patient_id,recorded_at,id);
CREATE INDEX bp_operations_target ON public.bp_amendment_operations(target_bp_id);
CREATE INDEX bp_operations_duplicate ON public.bp_amendment_operations(duplicate_of_bp_id);
CREATE INDEX bp_operations_predecessors ON public.bp_amendment_operations USING gin(predecessor_ids);

CREATE TABLE public.bp_exclusions (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patient_profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  bp_id uuid NOT NULL UNIQUE,
  UNIQUE (bp_id,patient_id),
  operation_id uuid NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN ('DATA_ENTRY_ERROR','MEASUREMENT_ERROR','DUPLICATE','WRONG_PATIENT','WRONG_CONTEXT','SOURCE_WITHDRAWAL','PROVENANCE_ERROR','CORRECTION_ERROR')),
  asserted_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bp_id,patient_id) REFERENCES public.blood_pressure_measurements(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (operation_id,patient_id) REFERENCES public.bp_amendment_operations(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (pg_catalog.isfinite(recorded_at) AND asserted_at=recorded_at)
);
CREATE INDEX bp_exclusions_operation ON public.bp_exclusions(operation_id);
CREATE INDEX bp_exclusions_patient ON public.bp_exclusions(patient_id,recorded_at,id);

CREATE TABLE public.bp_privacy_targets (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patient_profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  bp_id uuid NOT NULL UNIQUE,
  UNIQUE (bp_id,patient_id),
  operation_id uuid NOT NULL,
  reason_code text NOT NULL DEFAULT 'WRONG_PATIENT' CHECK (reason_code='WRONG_PATIENT'),
  asserted_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bp_id,patient_id) REFERENCES public.blood_pressure_measurements(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (operation_id,patient_id) REFERENCES public.bp_amendment_operations(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (pg_catalog.isfinite(recorded_at) AND asserted_at=recorded_at)
);
CREATE INDEX bp_privacy_operation ON public.bp_privacy_targets(operation_id);
CREATE INDEX bp_privacy_patient ON public.bp_privacy_targets(patient_id,recorded_at,id);

-- Structural provenance only; session authentication remains in the authorized service.
CREATE FUNCTION public.bp31_guard_operation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE ids uuid[]; b public.blood_pressure_measurements%ROWTYPE; e public.bp_exclusions%ROWTYPE;
BEGIN
  PERFORM public.eh012_lock_clinician(NEW.actor_user_id,NEW.patient_id);
  ids := ARRAY(SELECT DISTINCT x FROM pg_catalog.unnest(ARRAY[NEW.target_bp_id] || NEW.predecessor_ids ||
    CASE WHEN NEW.duplicate_of_bp_id IS NULL THEN '{}'::uuid[] ELSE ARRAY[NEW.duplicate_of_bp_id] END) x ORDER BY x);
  PERFORM id FROM public.blood_pressure_measurements WHERE id=ANY(ids) AND patient_id=NEW.patient_id ORDER BY id FOR UPDATE;
  IF (SELECT count(*) FROM public.blood_pressure_measurements WHERE id=ANY(ids) AND patient_id=NEW.patient_id)<>pg_catalog.cardinality(ids) THEN
    RAISE EXCEPTION 'Invalid BP scope' USING ERRCODE='23514';
  END IF;
  IF NEW.predecessor_ids IS DISTINCT FROM ARRAY(SELECT DISTINCT x FROM pg_catalog.unnest(NEW.predecessor_ids) x ORDER BY x)
    OR NEW.target_bp_id=ANY(NEW.predecessor_ids) THEN RAISE EXCEPTION 'Invalid frozen targets' USING ERRCODE='23514'; END IF;
  IF pg_catalog.cardinality(NEW.predecessor_ids)>0 AND EXISTS (
    WITH RECURSIVE ancestors(id) AS (
      SELECT o.target_bp_id FROM public.bp_amendment_operations o WHERE o.kind IN ('CORRECT','RESTATE') AND o.new_bp_id=NEW.target_bp_id
      UNION SELECT o.target_bp_id FROM public.bp_amendment_operations o JOIN ancestors a ON o.new_bp_id=a.id WHERE o.kind IN ('CORRECT','RESTATE')
    ) SELECT 1 FROM pg_catalog.unnest(NEW.predecessor_ids) p WHERE NOT EXISTS (SELECT 1 FROM ancestors a WHERE a.id=p)
  ) THEN RAISE EXCEPTION 'Invalid predecessor' USING ERRCODE='23514'; END IF;
  SELECT * INTO e FROM public.bp_exclusions WHERE bp_id=NEW.target_bp_id;
  IF NEW.kind IN ('EXCLUDE','CORRECT') AND e.id IS NOT NULL THEN RAISE EXCEPTION 'BP conflict' USING ERRCODE='23505'; END IF;
  IF NEW.kind='RESTATE' AND (e.id IS NULL OR EXISTS (SELECT 1 FROM public.bp_amendment_operations o WHERE o.id=e.operation_id AND o.new_bp_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'Invalid restatement' USING ERRCODE='23514'; END IF;
  IF NEW.kind='PRIVACY' AND EXISTS (SELECT 1 FROM public.bp_privacy_targets WHERE bp_id=ANY(ARRAY[NEW.target_bp_id] || NEW.predecessor_ids)) THEN
    RAISE EXCEPTION 'BP privacy conflict' USING ERRCODE='23505'; END IF;
  IF NEW.duplicate_of_bp_id IS NOT NULL AND (EXISTS (SELECT 1 FROM public.bp_exclusions WHERE bp_id=NEW.duplicate_of_bp_id)
    OR EXISTS (SELECT 1 FROM public.bp_privacy_targets WHERE bp_id=NEW.duplicate_of_bp_id)) THEN RAISE EXCEPTION 'Duplicate conflict' USING ERRCODE='23505'; END IF;
  NEW.recorded_at := pg_catalog.clock_timestamp()::timestamptz(3); NEW.asserted_at := NEW.recorded_at;
  IF EXISTS (SELECT 1 FROM public.blood_pressure_measurements WHERE id=ANY(ids) AND created_at>NEW.recorded_at) THEN
    RAISE EXCEPTION 'Invalid BP chronology' USING ERRCODE='23514'; END IF;
  IF NEW.new_bp_id IS NOT NULL THEN
    SELECT * INTO b FROM public.blood_pressure_measurements WHERE id=NEW.new_bp_id AND patient_id=NEW.patient_id;
    IF b.id IS NULL OR b.recorded_by_user_id<>NEW.actor_user_id OR b.source_kind<>'CLINICIAN_ENTRY'
      OR b.systolic<>NEW.systolic OR b.diastolic<>NEW.diastolic OR b.measured_at<>NEW.measured_at
      OR b.created_at>NEW.recorded_at OR NOT EXISTS (SELECT 1 FROM public.blood_pressure_measurements
        WHERE id=b.id AND xmin::text::bigint=(pg_catalog.pg_current_xact_id()::text::bigint % 4294967296))
      OR EXISTS (SELECT 1 FROM public.encounter_bp_associations WHERE blood_pressure_measurement_id=b.id)
      OR EXISTS (SELECT 1 FROM public.bp_amendment_operations WHERE target_bp_id=b.id)
      OR EXISTS (SELECT 1 FROM public.bp_exclusions WHERE bp_id=b.id)
      OR EXISTS (SELECT 1 FROM public.bp_privacy_targets WHERE bp_id=b.id) THEN
      RAISE EXCEPTION 'Replacement must be fresh' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.bp31_guard_child() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE o public.bp_amendment_operations%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.bp_amendment_operations WHERE id=NEW.operation_id AND patient_id=NEW.patient_id;
  IF o.id IS NULL OR NOT EXISTS (SELECT 1 FROM public.bp_amendment_operations WHERE id=o.id AND xmin::text::bigint=(pg_catalog.pg_current_xact_id()::text::bigint % 4294967296))
    OR NOT (NEW.bp_id=ANY(ARRAY[o.target_bp_id] || o.predecessor_ids)) THEN RAISE EXCEPTION 'Invalid BP operation scope' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='bp_exclusions' THEN
    IF o.kind NOT IN ('EXCLUDE','CORRECT','PRIVACY') OR NEW.reason_code<>o.reason_code THEN RAISE EXCEPTION 'Invalid exclusion' USING ERRCODE='23514'; END IF;
  ELSE
    IF o.kind<>'PRIVACY' AND NOT (o.kind='EXCLUDE' AND o.reason_code='WRONG_PATIENT') THEN RAISE EXCEPTION 'Invalid privacy assertion' USING ERRCODE='23514'; END IF;
  END IF;
  NEW.recorded_at := pg_catalog.clock_timestamp()::timestamptz(3); NEW.asserted_at := NEW.recorded_at;
  IF NEW.recorded_at<o.recorded_at THEN RAISE EXCEPTION 'Invalid BP chronology' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

-- Deferred completeness checks allow atomic parent/children insertion, never partial history.
CREATE FUNCTION public.bp31_complete_operation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE ids uuid[];
BEGIN
  ids := ARRAY[NEW.target_bp_id] || NEW.predecessor_ids;
  IF NEW.kind IN ('EXCLUDE','CORRECT') AND NOT EXISTS (SELECT 1 FROM public.bp_exclusions WHERE operation_id=NEW.id AND bp_id=NEW.target_bp_id) THEN
    RAISE EXCEPTION 'Incomplete exclusion' USING ERRCODE='23514'; END IF;
  IF NEW.kind='PRIVACY' OR (NEW.kind='EXCLUDE' AND NEW.reason_code='WRONG_PATIENT') THEN
    IF EXISTS (SELECT 1 FROM pg_catalog.unnest(ids) x WHERE NOT EXISTS (SELECT 1 FROM public.bp_privacy_targets p WHERE p.operation_id=NEW.id AND p.bp_id=x)
      OR NOT EXISTS (SELECT 1 FROM public.bp_exclusions e WHERE e.bp_id=x)) THEN RAISE EXCEPTION 'Incomplete privacy' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE FUNCTION public.bp31_immutable() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'BP amendment history is immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER bp_operation_insert BEFORE INSERT ON public.bp_amendment_operations FOR EACH ROW EXECUTE FUNCTION public.bp31_guard_operation();
CREATE CONSTRAINT TRIGGER bp_operation_complete AFTER INSERT ON public.bp_amendment_operations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.bp31_complete_operation();
CREATE TRIGGER bp_exclusion_insert BEFORE INSERT ON public.bp_exclusions FOR EACH ROW EXECUTE FUNCTION public.bp31_guard_child();
CREATE TRIGGER bp_privacy_insert BEFORE INSERT ON public.bp_privacy_targets FOR EACH ROW EXECUTE FUNCTION public.bp31_guard_child();
CREATE TRIGGER bp_operation_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.bp_amendment_operations FOR EACH STATEMENT EXECUTE FUNCTION public.bp31_immutable();
CREATE TRIGGER bp_exclusion_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.bp_exclusions FOR EACH STATEMENT EXECUTE FUNCTION public.bp31_immutable();
CREATE TRIGGER bp_privacy_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.bp_privacy_targets FOR EACH STATEMENT EXECUTE FUNCTION public.bp31_immutable();

-- Not authorization helpers. Call only inside an already patient-scoped read.
CREATE FUNCTION public.bp31_disclosable(bp uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT NOT EXISTS (SELECT 1 FROM public.bp_privacy_targets WHERE bp_id=bp)
    AND NOT EXISTS (SELECT 1 FROM public.bp_exclusions WHERE bp_id=bp AND reason_code='WRONG_PATIENT')
    -- A damaged child relation must not relax an explicitly frozen privacy assertion.
    AND NOT EXISTS (SELECT 1 FROM public.bp_amendment_operations o WHERE o.reason_code='WRONG_PATIENT'
      AND o.kind IN ('EXCLUDE','PRIVACY') AND (o.target_bp_id=bp OR o.predecessor_ids @> ARRAY[bp]))
$$;
CREATE FUNCTION public.bp31_effective(bp uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT public.bp31_disclosable(bp) AND NOT EXISTS (SELECT 1 FROM public.bp_exclusions WHERE bp_id=bp)
    AND NOT EXISTS (SELECT 1 FROM public.bp_amendment_operations WHERE target_bp_id=bp AND kind IN ('EXCLUDE','CORRECT'))
$$;
CREATE FUNCTION public.bp31_guard_association() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  IF NOT public.bp31_effective(NEW.blood_pressure_measurement_id) THEN
    RAISE EXCEPTION 'BP evidence unavailable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_bp31_association_insert BEFORE INSERT ON public.encounter_bp_associations FOR EACH ROW EXECUTE FUNCTION public.bp31_guard_association();
COMMIT;
