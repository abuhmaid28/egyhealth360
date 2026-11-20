BEGIN;
CREATE TYPE public.bp_measurement_source_kind AS ENUM ('PATIENT_SELF_ENTRY', 'CLINICIAN_ENTRY');
CREATE TABLE public.blood_pressure_measurements (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  patient_id uuid NOT NULL,
  systolic integer NOT NULL,
  diastolic integer NOT NULL,
  unit text NOT NULL,
  measured_at timestamptz(6) NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_by_user_id uuid NOT NULL,
  source_kind public.bp_measurement_source_kind NOT NULL,
  CONSTRAINT blood_pressure_measurements_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT blood_pressure_measurements_actor_fkey FOREIGN KEY (recorded_by_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT blood_pressure_measurements_unit_check CHECK (unit = 'mmHg'),
  CONSTRAINT blood_pressure_measurements_measured_at_check CHECK (
    pg_catalog.isfinite(measured_at) AND measured_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00'
    AND measured_at < TIMESTAMPTZ '10000-01-01 00:00:00+00'
    AND measured_at = pg_catalog.date_trunc('milliseconds', measured_at)),
  CONSTRAINT blood_pressure_measurements_created_at_check CHECK (pg_catalog.isfinite(created_at)),
  CONSTRAINT blood_pressure_measurements_chronology_check CHECK (measured_at <= created_at)
);
CREATE INDEX blood_pressure_measurements_patient_history_idx ON public.blood_pressure_measurements(patient_id, measured_at DESC, id DESC);
CREATE INDEX blood_pressure_measurements_actor_idx ON public.blood_pressure_measurements(recorded_by_user_id);
CREATE FUNCTION public.eh011_guard_bp_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE actor public.users%ROWTYPE; clinician uuid; assignment uuid; patient public.patient_profiles%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id=NEW.recorded_by_user_id FOR NO KEY UPDATE;
  IF NOT FOUND OR actor.status <> 'ACTIVE' OR actor.role NOT IN ('PATIENT','CLINICIAN') THEN
    RAISE EXCEPTION 'Invalid BP provenance' USING ERRCODE='23514', CONSTRAINT='blood_pressure_measurements_provenance_guard';
  END IF;
  IF actor.role='CLINICIAN' THEN
    SELECT id INTO clinician FROM public.clinician_profiles WHERE user_id=actor.id AND user_role='CLINICIAN' FOR SHARE;
    SELECT id INTO assignment FROM public.clinician_patient_assignments WHERE clinician_id=clinician AND patient_id=NEW.patient_id AND status='ACTIVE' AND ended_at IS NULL FOR SHARE;
    IF clinician IS NULL OR assignment IS NULL OR NEW.source_kind <> 'CLINICIAN_ENTRY' THEN
      RAISE EXCEPTION 'Invalid BP provenance' USING ERRCODE='23514', CONSTRAINT='blood_pressure_measurements_provenance_guard';
    END IF;
  END IF;
  SELECT * INTO patient FROM public.patient_profiles WHERE id=NEW.patient_id AND user_role='PATIENT' FOR SHARE;
  IF NOT FOUND OR (actor.role='PATIENT' AND (patient.user_id<>actor.id OR NEW.source_kind<>'PATIENT_SELF_ENTRY')) THEN
    RAISE EXCEPTION 'Invalid BP provenance' USING ERRCODE='23514', CONSTRAINT='blood_pressure_measurements_provenance_guard';
  END IF;
  NEW.created_at := pg_catalog.clock_timestamp()::timestamptz(3);
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.eh011_reject_bp_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'BP history is append-only' USING ERRCODE='23514', CONSTRAINT='blood_pressure_measurements_history_guard';
END;
$$;
CREATE TRIGGER blood_pressure_measurements_insert_guard BEFORE INSERT ON public.blood_pressure_measurements FOR EACH ROW EXECUTE FUNCTION public.eh011_guard_bp_insert();
CREATE TRIGGER blood_pressure_measurements_history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.blood_pressure_measurements FOR EACH STATEMENT EXECUTE FUNCTION public.eh011_reject_bp_mutation();
COMMIT;
