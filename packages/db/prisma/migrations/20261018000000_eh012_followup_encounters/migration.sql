BEGIN;
CREATE TYPE public.follow_up_appointment_status AS ENUM ('SCHEDULED','CANCELLED');
ALTER TABLE public.blood_pressure_measurements ADD CONSTRAINT blood_pressure_measurements_id_patient_key UNIQUE (id,patient_id);
CREATE TABLE public.follow_up_appointments (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  patient_id uuid NOT NULL,
  scheduled_at timestamptz(6) NOT NULL,
  purpose text NOT NULL,
  status public.follow_up_appointment_status NOT NULL DEFAULT 'SCHEDULED',
  created_by_user_id uuid NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at timestamptz(3),
  cancelled_by_user_id uuid,
  CONSTRAINT follow_up_appointments_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT follow_up_appointments_creator_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT follow_up_appointments_canceller_fkey FOREIGN KEY (cancelled_by_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT follow_up_appointments_purpose_check CHECK (purpose='HTN_BP_FOLLOWUP'),
  CONSTRAINT follow_up_appointments_scheduled_at_check CHECK (pg_catalog.isfinite(scheduled_at) AND scheduled_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00' AND scheduled_at < TIMESTAMPTZ '10000-01-01 00:00:00+00' AND scheduled_at=pg_catalog.date_trunc('milliseconds',scheduled_at)),
  CONSTRAINT follow_up_appointments_chronology_check CHECK (pg_catalog.isfinite(created_at) AND scheduled_at>created_at),
  CONSTRAINT follow_up_appointments_lifecycle_check CHECK (
    (status='SCHEDULED' AND cancelled_at IS NULL AND cancelled_by_user_id IS NULL)
    OR (status='CANCELLED' AND cancelled_at IS NOT NULL AND pg_catalog.isfinite(cancelled_at) AND cancelled_at>=created_at AND cancelled_by_user_id IS NOT NULL))
);
CREATE INDEX follow_up_appointments_patient_history_idx ON public.follow_up_appointments(patient_id,scheduled_at DESC,id DESC);
CREATE INDEX follow_up_appointments_creator_idx ON public.follow_up_appointments(created_by_user_id);
CREATE INDEX follow_up_appointments_canceller_idx ON public.follow_up_appointments(cancelled_by_user_id);
CREATE TABLE public.clinical_encounters (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  patient_id uuid NOT NULL,
  occurred_at timestamptz(6) NOT NULL,
  purpose text NOT NULL,
  recorded_by_user_id uuid NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT clinical_encounters_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT clinical_encounters_recorder_fkey FOREIGN KEY (recorded_by_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT clinical_encounters_id_patient_key UNIQUE(id,patient_id),
  CONSTRAINT clinical_encounters_purpose_check CHECK (purpose='HTN_BP_FOLLOWUP'),
  CONSTRAINT clinical_encounters_occurred_at_check CHECK (pg_catalog.isfinite(occurred_at) AND occurred_at>=TIMESTAMPTZ '0001-01-01 00:00:00+00' AND occurred_at<TIMESTAMPTZ '10000-01-01 00:00:00+00' AND occurred_at=pg_catalog.date_trunc('milliseconds',occurred_at)),
  CONSTRAINT clinical_encounters_chronology_check CHECK (pg_catalog.isfinite(created_at) AND occurred_at<=created_at)
);
CREATE INDEX clinical_encounters_patient_history_idx ON public.clinical_encounters(patient_id,occurred_at DESC,id DESC);
CREATE INDEX clinical_encounters_recorder_idx ON public.clinical_encounters(recorded_by_user_id);
CREATE TABLE public.encounter_bp_associations (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  patient_id uuid NOT NULL,
  encounter_id uuid NOT NULL,
  blood_pressure_measurement_id uuid NOT NULL,
  recorded_by_user_id uuid NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT encounter_bp_associations_measurement_key UNIQUE(blood_pressure_measurement_id),
  -- Redundant composite key required by Prisma for this one-to-one composite relation.
  CONSTRAINT encounter_bp_associations_measurement_patient_key UNIQUE(blood_pressure_measurement_id,patient_id),
  CONSTRAINT encounter_bp_associations_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT encounter_bp_associations_encounter_patient_fkey FOREIGN KEY (encounter_id,patient_id) REFERENCES public.clinical_encounters(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT encounter_bp_associations_measurement_patient_fkey FOREIGN KEY (blood_pressure_measurement_id,patient_id) REFERENCES public.blood_pressure_measurements(id,patient_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT encounter_bp_associations_recorder_fkey FOREIGN KEY (recorded_by_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT encounter_bp_associations_created_at_check CHECK (pg_catalog.isfinite(created_at))
);
CREATE INDEX encounter_bp_associations_patient_history_idx ON public.encounter_bp_associations(patient_id,encounter_id,created_at DESC,id DESC);
CREATE INDEX encounter_bp_associations_encounter_idx ON public.encounter_bp_associations(encounter_id,patient_id);
CREATE INDEX encounter_bp_associations_recorder_idx ON public.encounter_bp_associations(recorded_by_user_id);

-- Structural provenance only, not authentication. The service locks session between user/profile.
CREATE FUNCTION public.eh012_lock_clinician(actor_id uuid,target_patient_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE actor public.users%ROWTYPE; clinician uuid; assignment uuid; patient uuid;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id=actor_id FOR NO KEY UPDATE;
  IF NOT FOUND OR actor.role<>'CLINICIAN' OR actor.status<>'ACTIVE' THEN
    RAISE EXCEPTION 'Invalid evidence provenance' USING ERRCODE='23514',CONSTRAINT='eh012_provenance_guard';
  END IF;
  SELECT id INTO clinician FROM public.clinician_profiles WHERE user_id=actor_id AND user_role='CLINICIAN' FOR SHARE;
  SELECT id INTO assignment FROM public.clinician_patient_assignments WHERE clinician_id=clinician AND patient_id=target_patient_id AND status='ACTIVE' AND ended_at IS NULL FOR SHARE;
  SELECT id INTO patient FROM public.patient_profiles WHERE id=target_patient_id AND user_role='PATIENT' FOR SHARE;
  IF clinician IS NULL OR assignment IS NULL OR patient IS NULL THEN
    RAISE EXCEPTION 'Invalid evidence provenance' USING ERRCODE='23514',CONSTRAINT='eh012_provenance_guard';
  END IF;
END;
$$;
CREATE FUNCTION public.eh012_guard_appointment() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'SCHEDULED' OR NEW.cancelled_at IS NOT NULL OR NEW.cancelled_by_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Appointment must start scheduled' USING ERRCODE='23514',CONSTRAINT='follow_up_appointments_write_guard';
    END IF;
    PERFORM public.eh012_lock_clinician(NEW.created_by_user_id,NEW.patient_id);
    NEW.created_at:=pg_catalog.clock_timestamp()::timestamptz(3);
    RETURN NEW;
  END IF;
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN OLD; END IF;
  IF ROW(NEW.id,NEW.patient_id,NEW.scheduled_at,NEW.purpose,NEW.created_by_user_id,NEW.created_at,NEW.cancelled_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.patient_id,OLD.scheduled_at,OLD.purpose,OLD.created_by_user_id,OLD.created_at,OLD.cancelled_at)
    OR OLD.status<>'SCHEDULED' OR NEW.status<>'CANCELLED' OR NEW.cancelled_by_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid appointment mutation' USING ERRCODE='23514',CONSTRAINT='follow_up_appointments_write_guard';
  END IF;
  PERFORM public.eh012_lock_clinician(NEW.cancelled_by_user_id,NEW.patient_id);
  NEW.cancelled_at:=GREATEST(OLD.created_at,pg_catalog.clock_timestamp()::timestamptz(3));
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.eh012_guard_encounter_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  PERFORM public.eh012_lock_clinician(NEW.recorded_by_user_id,NEW.patient_id);
  NEW.created_at:=pg_catalog.clock_timestamp()::timestamptz(3);
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.eh012_guard_encounter_bp_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE encounter_time timestamptz; measurement_time timestamptz;
BEGIN
  PERFORM public.eh012_lock_clinician(NEW.recorded_by_user_id,NEW.patient_id);
  SELECT created_at INTO encounter_time FROM public.clinical_encounters WHERE id=NEW.encounter_id AND patient_id=NEW.patient_id FOR SHARE;
  SELECT created_at INTO measurement_time FROM public.blood_pressure_measurements WHERE id=NEW.blood_pressure_measurement_id AND patient_id=NEW.patient_id FOR UPDATE;
  IF encounter_time IS NULL OR measurement_time IS NULL THEN
    RAISE EXCEPTION 'Invalid association scope' USING ERRCODE='23514',CONSTRAINT='encounter_bp_associations_scope_guard';
  END IF;
  NEW.created_at:=GREATEST(encounter_time,measurement_time,pg_catalog.clock_timestamp()::timestamptz(3));
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.eh012_reject_appointment_removal() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Appointment history cannot be removed' USING ERRCODE='23514',CONSTRAINT='follow_up_appointments_removal_guard';
END;
$$;
CREATE FUNCTION public.eh012_reject_immutable_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Evidence history is immutable' USING ERRCODE='23514',CONSTRAINT='eh012_immutable_history_guard';
END;
$$;
CREATE TRIGGER follow_up_appointments_write_guard BEFORE INSERT OR UPDATE ON public.follow_up_appointments FOR EACH ROW EXECUTE FUNCTION public.eh012_guard_appointment();
CREATE TRIGGER follow_up_appointments_removal_guard BEFORE DELETE OR TRUNCATE ON public.follow_up_appointments FOR EACH STATEMENT EXECUTE FUNCTION public.eh012_reject_appointment_removal();
CREATE TRIGGER clinical_encounters_insert_guard BEFORE INSERT ON public.clinical_encounters FOR EACH ROW EXECUTE FUNCTION public.eh012_guard_encounter_insert();
CREATE TRIGGER clinical_encounters_history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.clinical_encounters FOR EACH STATEMENT EXECUTE FUNCTION public.eh012_reject_immutable_evidence_mutation();
CREATE TRIGGER encounter_bp_associations_insert_guard BEFORE INSERT ON public.encounter_bp_associations FOR EACH ROW EXECUTE FUNCTION public.eh012_guard_encounter_bp_insert();
CREATE TRIGGER encounter_bp_associations_history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.encounter_bp_associations FOR EACH STATEMENT EXECUTE FUNCTION public.eh012_reject_immutable_evidence_mutation();
COMMIT;
