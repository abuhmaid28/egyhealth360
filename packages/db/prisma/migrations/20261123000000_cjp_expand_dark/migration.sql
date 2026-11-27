-- Inert expansion. No rows, runtime callers, existing ACL changes or activation.
BEGIN;

CREATE TYPE public.care_journey_event_kind AS ENUM (
  'ENROLLED', 'CLINIC_VERIFIED', 'STANDING_OPT_IN', 'PARTICIPATION_ENDED',
  'CONSENT_ACTIVATED', 'BOOKING_ATTACHED', 'ANCHOR_REPLACED', 'CARE_COMPLETED',
  'ENDED', 'INTERRUPTED'
);
CREATE TYPE public.care_journey_binding_kind AS ENUM ('ANCHOR', 'VISIT');
CREATE TYPE public.care_journey_event_source AS ENUM ('PARTICIPANT', 'SYSTEM');

CREATE TABLE public.care_journey_pairs (
  patient_id uuid NOT NULL REFERENCES public.patient_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  clinician_id uuid NOT NULL REFERENCES public.clinician_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  enrolled_at timestamptz(3) NOT NULL,
  policy_version varchar(64) NOT NULL,
  enrollment_event_id uuid NOT NULL,
  enrollment_kind public.care_journey_event_kind NOT NULL DEFAULT 'ENROLLED',
  CONSTRAINT cjp_pair_pk PRIMARY KEY (patient_id, clinician_id),
  CONSTRAINT cjp_pair_evidence_shape CHECK (
    isfinite(enrolled_at) AND policy_version <> '' AND enrollment_kind = 'ENROLLED'
  )
);

CREATE TABLE public.care_journey_clinic_admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id uuid NOT NULL,
  clinician_user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  affiliation_id uuid NOT NULL REFERENCES public.directory_affiliations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  clinician_role public.user_role NOT NULL DEFAULT 'CLINICIAN',
  organization_kind public.organization_kind NOT NULL DEFAULT 'CLINIC',
  policy_version varchar(64) NOT NULL,
  purpose varchar(64) NOT NULL,
  credential_source varchar(64) NOT NULL,
  credential_issuer varchar(128) NOT NULL,
  credential_reference uuid NOT NULL,
  verified_at timestamptz(3) NOT NULL,
  valid_until timestamptz(3) NOT NULL,
  participated_at timestamptz(3) NOT NULL,
  ended_at timestamptz(3),
  verification_epoch integer NOT NULL,
  participation_epoch integer NOT NULL,
  verification_event_id uuid NOT NULL,
  participation_event_id uuid NOT NULL,
  end_event_id uuid,
  verification_kind public.care_journey_event_kind NOT NULL DEFAULT 'CLINIC_VERIFIED',
  participation_kind public.care_journey_event_kind NOT NULL DEFAULT 'STANDING_OPT_IN',
  end_kind public.care_journey_event_kind NOT NULL DEFAULT 'PARTICIPATION_ENDED',
  CONSTRAINT cjp_admission_provider_fk FOREIGN KEY (provider_id, clinician_user_id)
    REFERENCES public.clinician_directory(id, clinician_user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cjp_admission_clinician_fk FOREIGN KEY (clinician_id, clinician_user_id)
    REFERENCES public.clinician_profiles(id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cjp_admission_membership_fk FOREIGN KEY
    (membership_id, clinician_user_id, organization_id, clinician_role, organization_kind)
    REFERENCES public.organization_memberships(id, user_id, organization_id, user_role, organization_kind)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cjp_admission_scope UNIQUE
    (id, clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id, policy_version, purpose),
  CONSTRAINT cjp_admission_event_scope UNIQUE (id, clinician_id, organization_id, policy_version, purpose),
  CONSTRAINT cjp_admission_shape CHECK (
    clinician_role = 'CLINICIAN' AND organization_kind = 'CLINIC'
    AND policy_version <> '' AND purpose <> '' AND credential_source <> '' AND credential_issuer <> ''
    AND verification_epoch > 0 AND participation_epoch > 0
    AND isfinite(verified_at) AND isfinite(valid_until) AND verified_at < valid_until
    AND isfinite(participated_at) AND participated_at < valid_until
    AND (ended_at IS NULL OR (isfinite(ended_at) AND ended_at >= participated_at AND ended_at >= verified_at))
    AND (ended_at IS NULL) = (end_event_id IS NULL)
    AND verification_kind = 'CLINIC_VERIFIED' AND participation_kind = 'STANDING_OPT_IN'
    AND end_kind = 'PARTICIPATION_ENDED'
  )
);
CREATE UNIQUE INDEX cjp_admission_current ON public.care_journey_clinic_admissions
  (clinician_id, organization_id, provider_id, membership_id, affiliation_id, policy_version, purpose)
  WHERE ended_at IS NULL;

CREATE TABLE public.care_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  patient_user_id uuid NOT NULL,
  clinician_id uuid NOT NULL,
  clinician_user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  affiliation_id uuid NOT NULL,
  admission_id uuid NOT NULL,
  assignment_id uuid NOT NULL CONSTRAINT cjp_journey_assignment_key UNIQUE,
  scope_version varchar(64) NOT NULL,
  policy_version varchar(64) NOT NULL,
  purpose varchar(64) NOT NULL,
  consent_event_id uuid NOT NULL,
  consent_kind public.care_journey_event_kind NOT NULL DEFAULT 'CONSENT_ACTIVATED',
  clinic_status_version integer NOT NULL,
  verification_epoch integer NOT NULL,
  participation_epoch integer NOT NULL,
  started_at timestamptz(3) NOT NULL,
  original_pre_care_ceiling_at timestamptz(3) NOT NULL,
  hard_expires_at timestamptz(3) NOT NULL,
  first_care_completed_at timestamptz(3),
  latest_qualified_close_at timestamptz(3),
  effective_cutoff_at timestamptz(3),
  ended_at timestamptz(3),
  end_event_id uuid,
  end_kind public.care_journey_event_kind NOT NULL DEFAULT 'ENDED',
  end_reason varchar(32),
  CONSTRAINT cjp_journey_pair_fk FOREIGN KEY (patient_id, clinician_id)
    REFERENCES public.care_journey_pairs(patient_id, clinician_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cjp_journey_patient_fk FOREIGN KEY (patient_id, patient_user_id)
    REFERENCES public.patient_profiles(id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cjp_journey_assignment_fk FOREIGN KEY (assignment_id, clinician_id, patient_id)
    REFERENCES public.clinician_patient_assignments(id, clinician_id, patient_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cjp_journey_admission_fk FOREIGN KEY
    (admission_id, clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id, policy_version, purpose)
    REFERENCES public.care_journey_clinic_admissions
    (id, clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id, policy_version, purpose)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cjp_journey_scope UNIQUE
    (id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id),
  CONSTRAINT cjp_journey_event_scope UNIQUE
    (id, patient_id, clinician_id, organization_id, admission_id, policy_version, scope_version, purpose),
  CONSTRAINT cjp_journey_shape CHECK (
    scope_version <> '' AND consent_kind = 'CONSENT_ACTIVATED' AND end_kind = 'ENDED'
    AND clinic_status_version >= 0 AND verification_epoch > 0 AND participation_epoch > 0
    AND isfinite(started_at) AND isfinite(original_pre_care_ceiling_at) AND isfinite(hard_expires_at)
    AND started_at < original_pre_care_ceiling_at AND original_pre_care_ceiling_at <= hard_expires_at
    AND (first_care_completed_at IS NULL) = (latest_qualified_close_at IS NULL)
    AND (first_care_completed_at IS NULL OR
      (isfinite(first_care_completed_at) AND isfinite(latest_qualified_close_at)
       AND first_care_completed_at >= started_at AND first_care_completed_at < original_pre_care_ceiling_at
       AND latest_qualified_close_at >= first_care_completed_at AND latest_qualified_close_at < hard_expires_at))
    AND (ended_at IS NULL) = (effective_cutoff_at IS NULL)
    AND (ended_at IS NULL) = (end_event_id IS NULL)
    AND (ended_at IS NULL) = (end_reason IS NULL)
    AND (ended_at IS NULL OR
      (isfinite(ended_at) AND isfinite(effective_cutoff_at)
       AND effective_cutoff_at >= started_at AND effective_cutoff_at <= hard_expires_at
       AND ended_at >= effective_cutoff_at AND ended_at >= COALESCE(latest_qualified_close_at, started_at)
       AND end_reason IN ('PATIENT_STOP', 'CLINICIAN_END', 'EXPIRED', 'SCOPE_LOST', 'ANCHOR_INVALIDATED')))
  )
);
CREATE UNIQUE INDEX cjp_journey_unended_pair ON public.care_journeys (patient_id, clinician_id)
  WHERE ended_at IS NULL;

CREATE TABLE public.care_journey_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  slot_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  patient_user_id uuid NOT NULL,
  clinician_id uuid NOT NULL,
  clinician_user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  affiliation_id uuid NOT NULL,
  binding_kind public.care_journey_binding_kind NOT NULL,
  attached_at timestamptz(3) NOT NULL,
  ended_at timestamptz(3),
  replaced_binding_id uuid,
  CONSTRAINT cjp_binding_journey_fk FOREIGN KEY
    (journey_id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id)
    REFERENCES public.care_journeys
    (id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cjp_binding_booking_fk FOREIGN KEY
    (booking_id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id, slot_id)
    REFERENCES public.bookings(id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id, slot_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cjp_binding_scope UNIQUE (id, journey_id, binding_kind),
  CONSTRAINT cjp_binding_replacement_key UNIQUE (replaced_binding_id),
  CONSTRAINT cjp_binding_replaced_fk FOREIGN KEY (replaced_binding_id, journey_id, binding_kind)
    REFERENCES public.care_journey_bookings(id, journey_id, binding_kind) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT cjp_binding_shape CHECK (
    isfinite(attached_at) AND (ended_at IS NULL OR (isfinite(ended_at) AND ended_at >= attached_at))
    AND (replaced_binding_id IS NULL OR (replaced_binding_id <> id AND binding_kind = 'ANCHOR'))
  )
);
CREATE UNIQUE INDEX cjp_binding_current_booking ON public.care_journey_bookings (booking_id) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX cjp_binding_current_anchor ON public.care_journey_bookings (journey_id)
  WHERE ended_at IS NULL AND binding_kind = 'ANCHOR';
CREATE UNIQUE INDEX cjp_binding_original_anchor ON public.care_journey_bookings (journey_id)
  WHERE replaced_binding_id IS NULL AND binding_kind = 'ANCHOR';

CREATE TABLE public.care_journey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.care_journey_event_kind NOT NULL,
  source public.care_journey_event_source NOT NULL,
  patient_id uuid,
  clinician_id uuid NOT NULL REFERENCES public.clinician_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  journey_id uuid,
  admission_id uuid,
  organization_id uuid,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  actor_role public.user_role,
  session_evidence_id uuid,
  policy_version varchar(64) NOT NULL,
  scope_version varchar(64),
  purpose varchar(64),
  notice_version varchar(64),
  notice_digest varchar(64),
  locale varchar(2),
  affirmative boolean,
  credential_reference uuid,
  operation_key uuid,
  fingerprint varchar(64),
  recorded_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT cjp_event_pair_scope UNIQUE (id, kind, patient_id, clinician_id, policy_version, recorded_at),
  CONSTRAINT cjp_event_admission_scope UNIQUE (id, kind, admission_id, clinician_id, organization_id, policy_version, purpose, recorded_at),
  CONSTRAINT cjp_event_journey_scope UNIQUE (id, kind, journey_id, patient_id, clinician_id, organization_id, admission_id, policy_version, scope_version, purpose, recorded_at),
  CONSTRAINT cjp_event_operation UNIQUE (actor_user_id, kind, operation_key),
  CONSTRAINT cjp_event_pair_fk FOREIGN KEY (patient_id, clinician_id)
    REFERENCES public.care_journey_pairs(patient_id, clinician_id) ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT cjp_event_admission_fk FOREIGN KEY (admission_id, clinician_id, organization_id, policy_version, purpose)
    REFERENCES public.care_journey_clinic_admissions(id, clinician_id, organization_id, policy_version, purpose)
    ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT cjp_event_journey_fk FOREIGN KEY (journey_id, patient_id, clinician_id, organization_id, admission_id, policy_version, scope_version, purpose)
    REFERENCES public.care_journeys(id, patient_id, clinician_id, organization_id, admission_id, policy_version, scope_version, purpose)
    ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT cjp_event_shape CHECK ((
    isfinite(recorded_at) AND policy_version <> ''
    AND (source = 'PARTICIPANT') = (actor_user_id IS NOT NULL)
    AND (actor_user_id IS NULL) = (actor_role IS NULL)
    AND (actor_role IS NULL OR actor_role IN ('PATIENT', 'CLINICIAN', 'ADMIN'))
    AND (operation_key IS NULL) = (fingerprint IS NULL)
    AND (fingerprint IS NULL OR (source = 'PARTICIPANT' AND fingerprint ~ '^[0-9a-f]{64}$'))
    AND CASE
      WHEN kind = 'ENROLLED' THEN patient_id IS NOT NULL AND journey_id IS NULL AND admission_id IS NULL
        AND organization_id IS NULL AND booking_id IS NULL AND scope_version IS NULL AND purpose IS NULL
      WHEN kind IN ('CLINIC_VERIFIED', 'STANDING_OPT_IN', 'PARTICIPATION_ENDED') THEN admission_id IS NOT NULL
        AND organization_id IS NOT NULL AND purpose <> '' AND patient_id IS NULL AND journey_id IS NULL
        AND booking_id IS NULL AND scope_version IS NULL
      ELSE journey_id IS NOT NULL AND patient_id IS NOT NULL AND organization_id IS NOT NULL
        AND admission_id IS NOT NULL AND scope_version <> '' AND purpose <> ''
        AND (kind NOT IN ('CONSENT_ACTIVATED', 'BOOKING_ATTACHED', 'ANCHOR_REPLACED', 'CARE_COMPLETED') OR booking_id IS NOT NULL)
      END
    AND CASE
      WHEN kind = 'CONSENT_ACTIVATED' THEN
        source = 'PARTICIPANT' AND actor_role = 'PATIENT' AND session_evidence_id IS NOT NULL
        AND affirmative IS TRUE AND locale IN ('en','ar') AND notice_version <> '' AND notice_digest ~ '^[0-9a-f]{64}$'
      WHEN kind = 'STANDING_OPT_IN' THEN
        source = 'PARTICIPANT' AND actor_role = 'CLINICIAN'
        AND session_evidence_id IS NULL AND affirmative IS NULL AND locale IS NULL AND notice_version IS NULL AND notice_digest IS NULL
      WHEN kind = 'CARE_COMPLETED' THEN
        source = 'PARTICIPANT' AND actor_role = 'CLINICIAN'
        AND session_evidence_id IS NULL AND affirmative IS NULL AND locale IS NULL AND notice_version IS NULL AND notice_digest IS NULL
      WHEN kind = 'CLINIC_VERIFIED' THEN
        (source = 'SYSTEM' OR actor_role = 'ADMIN')
        AND session_evidence_id IS NULL AND affirmative IS NULL AND locale IS NULL AND notice_version IS NULL AND notice_digest IS NULL
      WHEN kind = 'PARTICIPATION_ENDED' THEN
        (source = 'SYSTEM' OR actor_role IN ('CLINICIAN', 'ADMIN'))
        AND session_evidence_id IS NULL AND affirmative IS NULL AND locale IS NULL AND notice_version IS NULL AND notice_digest IS NULL
      ELSE
        (source = 'SYSTEM' OR actor_role IN ('PATIENT', 'CLINICIAN'))
        AND session_evidence_id IS NULL AND affirmative IS NULL AND locale IS NULL AND notice_version IS NULL AND notice_digest IS NULL
      END
    AND (kind = 'CLINIC_VERIFIED') = (credential_reference IS NOT NULL)
  ) IS TRUE)
);
CREATE INDEX cjp_events_journey_history ON public.care_journey_events (journey_id, recorded_at, id);

ALTER TABLE public.care_journey_pairs ADD CONSTRAINT cjp_pair_enrollment_fk
  FOREIGN KEY (enrollment_event_id, enrollment_kind, patient_id, clinician_id, policy_version, enrolled_at)
  REFERENCES public.care_journey_events(id, kind, patient_id, clinician_id, policy_version, recorded_at)
  ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.care_journey_clinic_admissions
  ADD CONSTRAINT cjp_admission_verification_fk
    FOREIGN KEY (verification_event_id, verification_kind, id, clinician_id, organization_id, policy_version, purpose, verified_at)
    REFERENCES public.care_journey_events(id, kind, admission_id, clinician_id, organization_id, policy_version, purpose, recorded_at)
    ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT cjp_admission_participation_fk
    FOREIGN KEY (participation_event_id, participation_kind, id, clinician_id, organization_id, policy_version, purpose, participated_at)
    REFERENCES public.care_journey_events(id, kind, admission_id, clinician_id, organization_id, policy_version, purpose, recorded_at)
    ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT cjp_admission_end_fk
    FOREIGN KEY (end_event_id, end_kind, id, clinician_id, organization_id, policy_version, purpose, ended_at)
    REFERENCES public.care_journey_events(id, kind, admission_id, clinician_id, organization_id, policy_version, purpose, recorded_at)
    ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.care_journeys
  ADD CONSTRAINT cjp_journey_consent_fk
    FOREIGN KEY (consent_event_id, consent_kind, id, patient_id, clinician_id, organization_id, admission_id, policy_version, scope_version, purpose, started_at)
    REFERENCES public.care_journey_events(id, kind, journey_id, patient_id, clinician_id, organization_id, admission_id, policy_version, scope_version, purpose, recorded_at)
    ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT cjp_journey_end_fk
    FOREIGN KEY (end_event_id, end_kind, id, patient_id, clinician_id, organization_id, admission_id, policy_version, scope_version, purpose, ended_at)
    REFERENCES public.care_journey_events(id, kind, journey_id, patient_id, clinician_id, organization_id, admission_id, policy_version, scope_version, purpose, recorded_at)
    ON DELETE NO ACTION ON UPDATE RESTRICT DEFERRABLE INITIALLY DEFERRED;

-- Every trigger is sidecar-owned and uses caller authority.
CREATE FUNCTION public.cjp_reject_history_change() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Care Journey history is retained' USING ERRCODE = '23514';
END;
$$;

CREATE FUNCTION public.cjp_event_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  NEW.recorded_at := clock_timestamp()::timestamptz(3);
  IF NEW.actor_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.actor_user_id AND role = NEW.actor_role
  ) THEN
    RAISE EXCEPTION 'Invalid event attribution' USING ERRCODE = '23514';
  END IF;
  IF NEW.actor_role = 'PATIENT' AND (NEW.patient_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.patient_profiles WHERE id = NEW.patient_id AND user_id = NEW.actor_user_id
  )) THEN
    RAISE EXCEPTION 'Invalid patient event attribution' USING ERRCODE = '23514';
  END IF;
  IF NEW.actor_role = 'CLINICIAN' AND NOT EXISTS (
    SELECT 1 FROM public.clinician_profiles WHERE id = NEW.clinician_id AND user_id = NEW.actor_user_id
  ) THEN
    RAISE EXCEPTION 'Invalid clinician event attribution' USING ERRCODE = '23514';
  END IF;
  IF NEW.kind = 'CONSENT_ACTIVATED' AND NOT EXISTS (
    SELECT 1
    FROM public.patient_profiles p
    JOIN public.sessions s ON s.user_id = p.user_id
    WHERE p.id = NEW.patient_id AND p.user_id = NEW.actor_user_id
      AND s.id = NEW.session_evidence_id AND s.created_at <= NEW.recorded_at
      AND s.expires_at > NEW.recorded_at AND (s.revoked_at IS NULL OR s.revoked_at > NEW.recorded_at)
  ) THEN
    RAISE EXCEPTION 'Invalid consent attribution' USING ERRCODE = '23514';
  END IF;
  IF NEW.booking_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = NEW.booking_id AND patient_id = NEW.patient_id
      AND clinician_id = NEW.clinician_id AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Invalid event booking scope' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.cjp_admission_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ended_at IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid admission scope' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.users
      WHERE id = NEW.clinician_user_id AND role = 'CLINICIAN' AND status = 'ACTIVE'
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid admission scope' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.organizations
      WHERE id = NEW.organization_id AND kind = 'CLINIC' AND status = 'ACTIVE'
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid admission scope' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.organization_memberships
      WHERE id = NEW.membership_id AND user_id = NEW.clinician_user_id AND organization_id = NEW.organization_id
        AND user_role = 'CLINICIAN' AND organization_kind = 'CLINIC' AND status = 'ACTIVE' AND ended_at IS NULL
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid admission scope' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.clinician_directory
      WHERE id = NEW.provider_id AND clinician_id = NEW.clinician_id AND clinician_user_id = NEW.clinician_user_id
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid admission scope' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.directory_affiliations
      WHERE id = NEW.affiliation_id AND provider_id = NEW.provider_id AND membership_id = NEW.membership_id
        AND organization_id = NEW.organization_id AND clinician_user_id = NEW.clinician_user_id AND withdrawn_at IS NULL
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid admission scope' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF OLD.ended_at IS NOT NULL OR
      (to_jsonb(NEW) - ARRAY['ended_at','end_event_id','verified_at','valid_until','verification_event_id'])
      IS DISTINCT FROM
      (to_jsonb(OLD) - ARRAY['ended_at','end_event_id','verified_at','valid_until','verification_event_id'])
    THEN
      RAISE EXCEPTION 'Admission context is immutable' USING ERRCODE = '23514';
    END IF;
    IF (NEW.verified_at, NEW.valid_until, NEW.verification_event_id) IS DISTINCT FROM
       (OLD.verified_at, OLD.valid_until, OLD.verification_event_id)
       AND (NEW.ended_at IS NOT NULL OR NEW.verified_at <= OLD.verified_at
         OR NEW.verified_at >= OLD.valid_until OR clock_timestamp() >= OLD.valid_until
         OR NEW.verification_event_id = OLD.verification_event_id)
    THEN
      RAISE EXCEPTION 'Invalid verification refresh evidence' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.cjp_admission_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  -- Check only the final revision visible at commit.
  IF EXISTS (
    SELECT 1 FROM public.care_journey_clinic_admissions a
    LEFT JOIN public.care_journey_events e ON e.id = a.verification_event_id
    WHERE a.id = NEW.id AND (e.id IS NULL OR e.kind <> 'CLINIC_VERIFIED' OR e.credential_reference IS DISTINCT FROM a.credential_reference)
  ) THEN
    RAISE EXCEPTION 'Invalid verification evidence scope' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.cjp_journey_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  active_users integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ended_at IS NOT NULL OR NEW.first_care_completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid initial Journey history' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.users
      WHERE id IN (NEW.patient_user_id, NEW.clinician_user_id)
      ORDER BY id
      FOR SHARE;
    SELECT count(*) INTO active_users FROM public.users
      WHERE (id = NEW.patient_user_id AND role = 'PATIENT' AND status = 'ACTIVE')
         OR (id = NEW.clinician_user_id AND role = 'CLINICIAN' AND status = 'ACTIVE');
    IF active_users <> 2 THEN
      RAISE EXCEPTION 'Invalid Journey evidence snapshot' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.clinician_patient_assignments
      WHERE id = NEW.assignment_id AND clinician_id = NEW.clinician_id AND patient_id = NEW.patient_id
        AND status = 'ACTIVE' AND ended_at IS NULL
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid Journey evidence snapshot' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.organizations
      WHERE id = NEW.organization_id AND kind = 'CLINIC' AND status = 'ACTIVE'
        AND status_version = NEW.clinic_status_version
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid Journey evidence snapshot' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.organization_memberships
      WHERE id = NEW.membership_id AND user_id = NEW.clinician_user_id AND organization_id = NEW.organization_id
        AND user_role = 'CLINICIAN' AND organization_kind = 'CLINIC' AND status = 'ACTIVE' AND ended_at IS NULL
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid Journey evidence snapshot' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.directory_affiliations
      WHERE id = NEW.affiliation_id AND provider_id = NEW.provider_id AND membership_id = NEW.membership_id
        AND organization_id = NEW.organization_id AND clinician_user_id = NEW.clinician_user_id AND withdrawn_at IS NULL
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid Journey evidence snapshot' USING ERRCODE = '23514';
    END IF;
    PERFORM 1 FROM public.care_journey_clinic_admissions
      WHERE id = NEW.admission_id AND ended_at IS NULL AND valid_until > NEW.started_at
        AND verification_epoch = NEW.verification_epoch AND participation_epoch = NEW.participation_epoch
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid Journey evidence snapshot' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD.ended_at IS NOT NULL OR
    (to_jsonb(NEW) - ARRAY['ended_at','end_event_id','end_reason','effective_cutoff_at'])
    IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['ended_at','end_event_id','end_reason','effective_cutoff_at'])
  THEN
    -- Continuation remains deferred until exact completion evidence is approved.
    RAISE EXCEPTION 'Journey scope and history are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.cjp_consent_anchor() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.care_journeys j
    JOIN public.care_journey_bookings b ON b.journey_id = j.id
    JOIN public.bookings booking ON booking.id = b.booking_id
    WHERE j.id = NEW.journey_id AND j.consent_event_id = NEW.id
      AND b.binding_kind = 'ANCHOR' AND b.replaced_binding_id IS NULL
      AND booking.id = NEW.booking_id AND booking.end_at = j.original_pre_care_ceiling_at
  ) THEN
    RAISE EXCEPTION 'Consent requires the original exact anchor' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.cjp_booking_event_binding() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.care_journey_bookings b
    JOIN public.care_journeys j ON j.id = b.journey_id
    WHERE b.journey_id = NEW.journey_id
      AND b.booking_id = NEW.booking_id
      AND (NEW.kind <> 'CONSENT_ACTIVATED' OR (b.binding_kind = 'ANCHOR' AND b.replaced_binding_id IS NULL))
      AND (NEW.kind <> 'BOOKING_ATTACHED' OR (b.binding_kind = 'VISIT' AND b.replaced_binding_id IS NULL))
      AND (NEW.kind <> 'ANCHOR_REPLACED' OR (b.binding_kind = 'ANCHOR' AND b.replaced_binding_id IS NOT NULL))
      AND (NEW.kind NOT IN ('BOOKING_ATTACHED', 'ANCHOR_REPLACED', 'CARE_COMPLETED') OR j.ended_at IS NULL)
  ) THEN
    RAISE EXCEPTION 'Invalid booking event binding' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION public.cjp_journey_end_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.care_journey_events e
    WHERE e.id = NEW.end_event_id
      AND e.kind = 'ENDED'
      AND e.journey_id = NEW.id
      AND (
        (NEW.end_reason = 'PATIENT_STOP' AND e.source = 'PARTICIPANT' AND e.actor_role = 'PATIENT' AND e.actor_user_id = NEW.patient_user_id)
        OR (NEW.end_reason = 'CLINICIAN_END' AND e.source = 'PARTICIPANT' AND e.actor_role = 'CLINICIAN' AND e.actor_user_id = NEW.clinician_user_id)
        OR (NEW.end_reason = 'EXPIRED' AND e.source = 'SYSTEM' AND NEW.effective_cutoff_at <= NEW.ended_at)
        OR (NEW.end_reason IN ('SCOPE_LOST', 'ANCHOR_INVALIDATED') AND (
          e.source = 'SYSTEM'
          OR (e.source = 'PARTICIPANT' AND (
            (e.actor_role = 'PATIENT' AND e.actor_user_id = NEW.patient_user_id)
            OR (e.actor_role = 'CLINICIAN' AND e.actor_user_id = NEW.clinician_user_id)
          ))
        ))
      )
  ) THEN
    RAISE EXCEPTION 'Invalid terminal Journey evidence' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION public.cjp_ended_event_commit() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NEW.kind = 'ENDED' AND NOT EXISTS (
    SELECT 1 FROM public.care_journeys j
    WHERE j.id = NEW.journey_id AND j.ended_at IS NOT NULL AND j.end_event_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Ended event requires exact terminated Journey' USING ERRCODE = '23514';
  END IF;
  IF NEW.kind = 'PARTICIPATION_ENDED' AND NOT EXISTS (
    SELECT 1 FROM public.care_journey_clinic_admissions a
    WHERE a.id = NEW.admission_id AND a.ended_at IS NOT NULL AND a.end_event_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Participation ended event requires exact terminated admission' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION public.cjp_binding_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  slot_end timestamptz(3);
  j_row public.care_journeys%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.ended_at IS NOT NULL OR NEW.ended_at IS NULL OR
      (to_jsonb(NEW) - 'ended_at') IS DISTINCT FROM (to_jsonb(OLD) - 'ended_at')
    THEN
      RAISE EXCEPTION 'Booking binding history is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid booking binding' USING ERRCODE = '23514';
  END IF;
  SELECT end_at INTO slot_end FROM public.availability_slots
    WHERE id = NEW.slot_id AND clinician_id = NEW.clinician_id AND clinician_user_id = NEW.clinician_user_id
      AND organization_id = NEW.organization_id AND provider_id = NEW.provider_id
      AND membership_id = NEW.membership_id AND affiliation_id = NEW.affiliation_id
    FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid booking binding' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO j_row FROM public.care_journeys WHERE id = NEW.journey_id FOR SHARE;
  IF NOT FOUND OR j_row.ended_at IS NOT NULL
    OR NEW.attached_at < j_row.started_at
    OR NEW.attached_at >= j_row.hard_expires_at
    OR (NEW.binding_kind = 'ANCHOR' AND slot_end > j_row.original_pre_care_ceiling_at)
  THEN
    RAISE EXCEPTION 'Invalid booking binding' USING ERRCODE = '23514';
  END IF;
  IF NEW.replaced_binding_id IS NOT NULL THEN
    PERFORM 1 FROM public.care_journey_bookings old_binding JOIN public.bookings b ON b.id = NEW.booking_id
      WHERE old_binding.id = NEW.replaced_binding_id AND old_binding.journey_id = NEW.journey_id
        AND old_binding.ended_at <= NEW.attached_at AND b.predecessor_id = old_binding.booking_id
      FOR SHARE OF old_binding;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid booking binding' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER cjp_admission_evidence_guard AFTER INSERT OR UPDATE ON public.care_journey_clinic_admissions
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.cjp_admission_evidence();
CREATE CONSTRAINT TRIGGER cjp_consent_anchor_guard AFTER INSERT ON public.care_journey_events
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.kind = 'CONSENT_ACTIVATED')
  EXECUTE FUNCTION public.cjp_consent_anchor();
CREATE CONSTRAINT TRIGGER cjp_booking_event_binding_guard AFTER INSERT ON public.care_journey_events
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.booking_id IS NOT NULL)
  EXECUTE FUNCTION public.cjp_booking_event_binding();
CREATE CONSTRAINT TRIGGER cjp_ended_event_commit_guard AFTER INSERT ON public.care_journey_events
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.kind IN ('ENDED', 'PARTICIPATION_ENDED'))
  EXECUTE FUNCTION public.cjp_ended_event_commit();
CREATE CONSTRAINT TRIGGER cjp_journey_end_evidence_guard AFTER UPDATE ON public.care_journeys
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION public.cjp_journey_end_evidence();
CREATE TRIGGER cjp_event_insert_guard BEFORE INSERT ON public.care_journey_events
  FOR EACH ROW EXECUTE FUNCTION public.cjp_event_insert();
CREATE TRIGGER cjp_admission_write_guard BEFORE INSERT OR UPDATE ON public.care_journey_clinic_admissions
  FOR EACH ROW EXECUTE FUNCTION public.cjp_admission_guard();
CREATE TRIGGER cjp_journey_write_guard BEFORE INSERT OR UPDATE ON public.care_journeys
  FOR EACH ROW EXECUTE FUNCTION public.cjp_journey_guard();
CREATE TRIGGER cjp_binding_write_guard BEFORE INSERT OR UPDATE ON public.care_journey_bookings
  FOR EACH ROW EXECUTE FUNCTION public.cjp_binding_guard();
CREATE TRIGGER cjp_pair_history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.care_journey_pairs
  FOR EACH STATEMENT EXECUTE FUNCTION public.cjp_reject_history_change();
CREATE TRIGGER cjp_event_history_guard BEFORE UPDATE OR DELETE OR TRUNCATE ON public.care_journey_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.cjp_reject_history_change();
CREATE TRIGGER cjp_admission_history_guard BEFORE DELETE OR TRUNCATE ON public.care_journey_clinic_admissions
  FOR EACH STATEMENT EXECUTE FUNCTION public.cjp_reject_history_change();
CREATE TRIGGER cjp_journey_history_guard BEFORE DELETE OR TRUNCATE ON public.care_journeys
  FOR EACH STATEMENT EXECUTE FUNCTION public.cjp_reject_history_change();
CREATE TRIGGER cjp_binding_history_guard BEFORE DELETE OR TRUNCATE ON public.care_journey_bookings
  FOR EACH STATEMENT EXECUTE FUNCTION public.cjp_reject_history_change();

REVOKE ALL ON FUNCTION public.cjp_reject_history_change(), public.cjp_event_insert(),
  public.cjp_admission_guard(), public.cjp_admission_evidence(), public.cjp_journey_guard(),
  public.cjp_consent_anchor(), public.cjp_booking_event_binding(), public.cjp_journey_end_evidence(),
  public.cjp_ended_event_commit(), public.cjp_binding_guard()
  FROM PUBLIC;

COMMIT;
