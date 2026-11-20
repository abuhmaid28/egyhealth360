BEGIN;
CREATE TYPE public.record_coverage_source_type AS ENUM ('SYNTHETIC_BENCHMARK');
CREATE TYPE public.record_coverage_status AS ENUM ('COMPLETE','INCOMPLETE','UNKNOWN');
CREATE TABLE public.record_coverage_windows (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  patient_id uuid NOT NULL,
  source_type public.record_coverage_source_type NOT NULL,
  source_reference text NOT NULL,
  coverage_status public.record_coverage_status NOT NULL,
  start_at timestamptz(6) NOT NULL,
  end_at timestamptz(6) NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT record_coverage_windows_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT record_coverage_windows_assertion_key UNIQUE (patient_id, source_type, source_reference, coverage_status, start_at, end_at),
  CONSTRAINT record_coverage_windows_source_reference_check CHECK (source_reference ~ '^[A-Za-z0-9_.-]{1,128}$'),
  CONSTRAINT record_coverage_windows_start_at_check CHECK (pg_catalog.isfinite(start_at) AND start_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00' AND start_at < TIMESTAMPTZ '10000-01-01 00:00:00+00' AND start_at=pg_catalog.date_trunc('milliseconds',start_at)),
  CONSTRAINT record_coverage_windows_end_at_check CHECK (pg_catalog.isfinite(end_at) AND end_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00' AND end_at < TIMESTAMPTZ '10000-01-01 00:00:00+00' AND end_at=pg_catalog.date_trunc('milliseconds',end_at)),
  CONSTRAINT record_coverage_windows_chronology_check CHECK (end_at > start_at),
  CONSTRAINT record_coverage_windows_created_at_check CHECK (pg_catalog.isfinite(created_at))
);
CREATE INDEX record_coverage_windows_partition_idx ON public.record_coverage_windows(patient_id, source_type, source_reference, start_at, end_at);

CREATE FUNCTION public.eh013_guard_coverage_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE patient uuid;
BEGIN
  SELECT id INTO patient FROM public.patient_profiles WHERE id=NEW.patient_id AND user_role='PATIENT' FOR SHARE;
  IF patient IS NULL THEN
    RAISE EXCEPTION 'Invalid patient profile' USING ERRCODE='23514',CONSTRAINT='record_coverage_windows_scope_guard';
  END IF;
  NEW.created_at:=pg_catalog.clock_timestamp()::timestamptz(3);
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.eh013_reject_coverage_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Record coverage history is immutable' USING ERRCODE='23514',CONSTRAINT='eh013_immutable_coverage_guard';
END;
$$;

CREATE TRIGGER record_coverage_windows_insert_guard BEFORE INSERT ON public.record_coverage_windows FOR EACH ROW EXECUTE FUNCTION public.eh013_guard_coverage_insert();
CREATE TRIGGER record_coverage_windows_history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.record_coverage_windows FOR EACH STATEMENT EXECUTE FUNCTION public.eh013_reject_coverage_mutation();
COMMIT;
