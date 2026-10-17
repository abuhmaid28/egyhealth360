BEGIN;

CREATE TYPE public.observed_applicability_source_type AS ENUM ('SYNTHETIC_OBSERVED_INPUT');
CREATE TYPE public.observed_age_assertion_state AS ENUM ('NO_ASSERTION', 'UNKNOWN', 'ASSERTED_VALUE');
CREATE TYPE public.observed_pregnancy_status AS ENUM ('PREGNANT', 'NOT_PREGNANT', 'UNKNOWN');
CREATE TYPE public.observed_condition_status AS ENUM ('PRESENT', 'ABSENT', 'UNKNOWN');

CREATE TABLE public.observed_applicability_snapshots (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  patient_id uuid NOT NULL,
  source_type public.observed_applicability_source_type NOT NULL,
  source_reference text COLLATE "C" NOT NULL,
  assertion_reference text COLLATE "C" NOT NULL,
  effective_at timestamptz(6) NOT NULL,
  asserted_at timestamptz(6) NOT NULL,
  recorded_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  age_assertion_state public.observed_age_assertion_state NOT NULL,
  age_years_at_assessment integer,
  pregnancy_status public.observed_pregnancy_status,
  hypertension_status public.observed_condition_status,
  cvd_status public.observed_condition_status,
  diabetes_status public.observed_condition_status,
  ckd_status public.observed_condition_status,
  CONSTRAINT oa_snapshots_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT oa_snapshots_source_identity_key UNIQUE (patient_id, source_type, source_reference, assertion_reference),
  CONSTRAINT oa_snapshots_scope_key UNIQUE (id, patient_id, source_type, source_reference),
  CONSTRAINT oa_snapshots_age_assertion_check CHECK (
    (
      (age_assertion_state = 'NO_ASSERTION' AND age_years_at_assessment IS NULL)
      OR (age_assertion_state = 'UNKNOWN' AND age_years_at_assessment IS NULL)
      OR (age_assertion_state = 'ASSERTED_VALUE'
          AND age_years_at_assessment IS NOT NULL
          AND age_years_at_assessment >= 0)
    ) IS TRUE
  ),
  CONSTRAINT oa_snapshots_source_reference_check CHECK (source_reference ~ '^[A-Za-z0-9_.-]{1,128}$'),
  CONSTRAINT oa_snapshots_assertion_reference_check CHECK (assertion_reference ~ '^[A-Za-z0-9_.-]{1,128}$'),
  CONSTRAINT oa_snapshots_effective_at_check CHECK (pg_catalog.isfinite(effective_at) AND effective_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00' AND effective_at < TIMESTAMPTZ '10000-01-01 00:00:00+00' AND effective_at = pg_catalog.date_trunc('milliseconds', effective_at)),
  CONSTRAINT oa_snapshots_asserted_at_check CHECK (pg_catalog.isfinite(asserted_at) AND asserted_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00' AND asserted_at < TIMESTAMPTZ '10000-01-01 00:00:00+00' AND asserted_at = pg_catalog.date_trunc('milliseconds', asserted_at)),
  CONSTRAINT oa_snapshots_recorded_at_check CHECK (pg_catalog.isfinite(recorded_at) AND recorded_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00' AND recorded_at < TIMESTAMPTZ '10000-01-01 00:00:00+00'),
  CONSTRAINT oa_snapshots_chronology_check CHECK (effective_at <= asserted_at AND asserted_at <= recorded_at)
);

CREATE INDEX oa_snapshots_point_idx ON public.observed_applicability_snapshots(patient_id, effective_at, source_type, source_reference, assertion_reference, id);

CREATE TABLE public.observed_applicability_retractions (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  source_type public.observed_applicability_source_type NOT NULL,
  source_reference text COLLATE "C" NOT NULL,
  retraction_reference text COLLATE "C" NOT NULL,
  asserted_at timestamptz(6) NOT NULL,
  recorded_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason_code text NOT NULL,
  CONSTRAINT oa_retractions_target_key UNIQUE (snapshot_id),
  CONSTRAINT oa_retractions_source_identity_key UNIQUE (patient_id, source_type, source_reference, retraction_reference),
  CONSTRAINT oa_retractions_target_scope_key UNIQUE (snapshot_id, patient_id, source_type, source_reference),
  CONSTRAINT oa_retractions_snapshot_scope_fkey FOREIGN KEY (snapshot_id, patient_id, source_type, source_reference) REFERENCES public.observed_applicability_snapshots(id, patient_id, source_type, source_reference) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT oa_retractions_source_reference_check CHECK (source_reference ~ '^[A-Za-z0-9_.-]{1,128}$'),
  CONSTRAINT oa_retractions_retraction_reference_check CHECK (retraction_reference ~ '^[A-Za-z0-9_.-]{1,128}$'),
  CONSTRAINT oa_retractions_asserted_at_check CHECK (pg_catalog.isfinite(asserted_at) AND asserted_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00' AND asserted_at < TIMESTAMPTZ '10000-01-01 00:00:00+00' AND asserted_at = pg_catalog.date_trunc('milliseconds', asserted_at)),
  CONSTRAINT oa_retractions_recorded_at_check CHECK (pg_catalog.isfinite(recorded_at) AND recorded_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00' AND recorded_at < TIMESTAMPTZ '10000-01-01 00:00:00+00'),
  CONSTRAINT oa_retractions_chronology_check CHECK (asserted_at <= recorded_at),
  CONSTRAINT oa_retractions_reason_check CHECK (reason_code = 'SOURCE_ASSERTION_WITHDRAWN')
);

CREATE FUNCTION public.eh015_guard_snapshot_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE patient uuid;
BEGIN
  SELECT id INTO patient FROM public.patient_profiles WHERE id=NEW.patient_id AND user_role='PATIENT' FOR SHARE;
  IF patient IS NULL THEN
    RAISE EXCEPTION 'Invalid patient profile' USING ERRCODE='23514',CONSTRAINT='oa_snapshots_scope_guard';
  END IF;
  NEW.recorded_at:=pg_catalog.clock_timestamp()::timestamptz(3);
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.eh015_guard_retraction_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE
  v_patient uuid;
  v_target public.observed_applicability_snapshots%ROWTYPE;
BEGIN
  SELECT id INTO v_patient FROM public.patient_profiles WHERE id=NEW.patient_id AND user_role='PATIENT' FOR SHARE;
  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'Invalid patient profile' USING ERRCODE='23514',CONSTRAINT='oa_retractions_scope_guard';
  END IF;

  SELECT * INTO v_target FROM public.observed_applicability_snapshots
  WHERE id=NEW.snapshot_id AND patient_id=NEW.patient_id AND source_type=NEW.source_type AND source_reference=NEW.source_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target snapshot not found in scope' USING ERRCODE='23514',CONSTRAINT='oa_retractions_target_scope_guard';
  END IF;

  IF NEW.asserted_at < v_target.asserted_at THEN
    RAISE EXCEPTION 'Retraction asserted_at cannot precede target asserted_at' USING ERRCODE='23514',CONSTRAINT='oa_retractions_target_chronology_guard';
  END IF;

  NEW.recorded_at:=pg_catalog.clock_timestamp()::timestamptz(3);

  IF NEW.recorded_at < v_target.recorded_at THEN
    RAISE EXCEPTION 'Retraction recorded_at cannot precede target recorded_at' USING ERRCODE='23514',CONSTRAINT='oa_retractions_receipt_chronology_guard';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.eh015_reject_applicability_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Observed clinical applicability history is immutable' USING ERRCODE='23514',CONSTRAINT='eh015_immutable_applicability_guard';
END;
$$;

CREATE TRIGGER oa_snapshots_insert_guard BEFORE INSERT ON public.observed_applicability_snapshots FOR EACH ROW EXECUTE FUNCTION public.eh015_guard_snapshot_insert();
CREATE TRIGGER oa_retractions_insert_guard BEFORE INSERT ON public.observed_applicability_retractions FOR EACH ROW EXECUTE FUNCTION public.eh015_guard_retraction_insert();
CREATE TRIGGER oa_snapshots_history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.observed_applicability_snapshots FOR EACH STATEMENT EXECUTE FUNCTION public.eh015_reject_applicability_mutation();
CREATE TRIGGER oa_retractions_history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.observed_applicability_retractions FOR EACH STATEMENT EXECUTE FUNCTION public.eh015_reject_applicability_mutation();

COMMIT;
