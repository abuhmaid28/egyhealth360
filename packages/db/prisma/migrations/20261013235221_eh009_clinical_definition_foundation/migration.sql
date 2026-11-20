BEGIN;

-- CreateEnum
CREATE TYPE "clinical_definition_status" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateTable
CREATE TABLE "guideline_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "publication_identity" TEXT NOT NULL,
    "publication_year" INTEGER NOT NULL,
    "reference_identifier" TEXT,
    "reference_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guideline_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition_domain" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "guideline_source_id" UUID NOT NULL,
    "status" "clinical_definition_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "retired_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_rule_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "rule_key" TEXT NOT NULL,
    "rule_version" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_rule_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guideline_sources_source_key_key" ON "guideline_sources"("source_key");

-- CreateIndex
CREATE UNIQUE INDEX "guideline_sources_publication_key" ON "guideline_sources"("publisher", "title", "publication_identity");

-- CreateIndex
CREATE INDEX "care_plan_templates_source_idx" ON "care_plan_templates"("guideline_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "care_plan_templates_key_version_key" ON "care_plan_templates"("template_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "care_plan_templates_name_version_key" ON "care_plan_templates"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "care_rule_definitions_template_rule_key" ON "care_rule_definitions"("template_id", "rule_key");

-- CreateIndex
CREATE UNIQUE INDEX "care_rule_definitions_key_version_key" ON "care_rule_definitions"("rule_key", "rule_version");

-- AddForeignKey
ALTER TABLE "care_plan_templates" ADD CONSTRAINT "care_plan_templates_source_fkey" FOREIGN KEY ("guideline_source_id") REFERENCES "guideline_sources"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "care_rule_definitions" ADD CONSTRAINT "care_rule_definitions_template_fkey" FOREIGN KEY ("template_id") REFERENCES "care_plan_templates"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Approved fixed contract, Issue #16 comment 6157539102. No reference rows.
CREATE FUNCTION eh009_is_htn_fu_v1(value jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = pg_catalog, public, pg_temp AS $function$
  SELECT COALESCE(value = $definition${
  "schemaVersion": "eh-cr-htn-fu-001/v1",
  "domain": "HYPERTENSION",
  "applicability": {
    "combination": "ALL",
    "requiredKnownFacts": [
      "age_years_at_trigger",
      "pregnancy_status_at_trigger",
      "hypertension_diagnosis",
      "known_CVD",
      "diabetes_mellitus",
      "chronic_kidney_disease"
    ],
    "age": {
      "field": "age_years_at_trigger",
      "operator": "GTE",
      "value": 18
    },
    "pregnancy": {
      "field": "pregnancy_status_at_trigger",
      "requirement": "KNOWN_NON_PREGNANT"
    },
    "hypertensionDiagnosis": {
      "field": "hypertension_diagnosis",
      "equals": true
    },
    "knownCvd": {
      "field": "known_CVD",
      "equals": false
    },
    "diabetesMellitus": {
      "field": "diabetes_mellitus",
      "equals": false
    },
    "chronicKidneyDisease": {
      "field": "chronic_kidney_disease",
      "equals": false
    },
    "missingOrUnknownRequiredFact": "DO_NOT_ASSUME_ELIGIBLE"
  },
  "trigger": {
    "kind": "QUALIFYING_OBSERVED_BP_ASSESSMENT",
    "combination": "ALL",
    "systolic": {
      "unit": "mmHg",
      "operator": "LT",
      "value": 140
    },
    "diastolic": {
      "unit": "mmHg",
      "operator": "LT",
      "value": 90
    },
    "triggerTime": "ASSESSMENT_TIME"
  },
  "action": {
    "code": "HTN_BP_FOLLOWUP",
    "label": "Hypertension BP reassessment / follow-up"
  },
  "timing": {
    "anchor": "TRIGGER_TIME",
    "recommendedWindowStart": {
      "operation": "ADD_CALENDAR_MONTHS",
      "value": 3
    },
    "dueBy": {
      "operation": "ADD_CALENDAR_MONTHS",
      "value": 6
    },
    "overdueBoundary": "STRICTLY_AFTER_DUE_BY"
  },
  "completion": {
    "combination": "ALL",
    "relevantFollowupEncounter": "REQUIRED",
    "bpAssessmentAssociatedWithFollowup": "REQUIRED",
    "followupTime": {
      "afterTrigger": "STRICT",
      "atOrBeforeDueBy": true
    },
    "beforeRecommendedWindowStartAllowed": true
  },
  "scheduleEvidence": {
    "kind": "FUTURE_APPOINTMENT",
    "explicitLinkToActionRequired": true,
    "finalScheduledDecisionContract": "DEFERRED"
  },
  "exemptionPolicy": {
    "automaticMedicalExemption": "NONE",
    "manualExemptionRequirements": [
      "EXPLICIT",
      "AUDITABLE",
      "REASONED"
    ],
    "manualWorkflow": "DEFERRED"
  },
  "coverageRequirement": {
    "trueGapRequires": "SUFFICIENT_RELEVANT_RECORD_COVERAGE",
    "relevantPeriod": {
      "start": "AFTER_TRIGGER_TIME",
      "end": "EXPLICIT_EVALUATION_TIME"
    },
    "insufficientCoverageWithoutStrongerResolvingEvidence": "UNCERTAIN",
    "outsideRelevantPeriodAloneForcesUncertain": false,
    "sufficiencyAlgorithm": "DEFERRED"
  },
  "sourceReferences": [
    {
      "sourceKey": "WHO-HTN-2021",
      "publicationIdentity": "2021",
      "section": "3.6",
      "recommendation": 6,
      "purpose": "CONTROL_TARGET"
    },
    {
      "sourceKey": "WHO-HTN-2021",
      "publicationIdentity": "2021",
      "section": "3.7",
      "recommendation": 7,
      "purpose": "FOLLOWUP_INTERVAL"
    }
  ],
  "repositoryEvidence": {
    "baselineCommit": "a4b2f2a4a496daba32aead5b612cb105e8873d27",
    "catalog": "docs/research/CLINICAL_RULE_CATALOG_V1.md",
    "sourceAudit": "docs/research/CLINICAL_RULE_SOURCE_AUDIT.md",
    "researchProtocol": "docs/research/EXPERIMENT_PROTOCOL_V1.md"
  }
}$definition$::jsonb, false)
$function$;

ALTER TABLE guideline_sources ADD CONSTRAINT guideline_sources_text_check CHECK (
  btrim(source_key, E' \t\n\r\f\013') <> '' AND btrim(title, E' \t\n\r\f\013') <> ''
  AND btrim(publisher, E' \t\n\r\f\013') <> '' AND btrim(publication_identity, E' \t\n\r\f\013') <> ''
  AND (reference_identifier IS NULL OR btrim(reference_identifier, E' \t\n\r\f\013') <> '')
  AND (reference_url IS NULL OR btrim(reference_url, E' \t\n\r\f\013') <> '')
);
ALTER TABLE guideline_sources ADD CONSTRAINT guideline_sources_year_check CHECK (publication_year BETWEEN 1 AND 9999);
ALTER TABLE guideline_sources ADD CONSTRAINT guideline_sources_timestamps_check CHECK (updated_at = created_at);
ALTER TABLE care_plan_templates ADD CONSTRAINT care_plan_templates_text_check CHECK (
  btrim(template_key, E' \t\n\r\f\013') <> '' AND btrim(name, E' \t\n\r\f\013') <> '' AND btrim(version, E' \t\n\r\f\013') <> ''
);
ALTER TABLE care_plan_templates ADD CONSTRAINT care_plan_templates_domain_check CHECK (condition_domain = 'HYPERTENSION');
ALTER TABLE care_plan_templates ADD CONSTRAINT care_plan_templates_version_check CHECK (version COLLATE "C" ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-draft)?$');
ALTER TABLE care_plan_templates ADD CONSTRAINT care_plan_templates_lifecycle_check CHECK (
  updated_at >= created_at AND
  ((status = 'DRAFT' AND published_at IS NULL AND retired_at IS NULL)
   OR (status = 'PUBLISHED' AND published_at IS NOT NULL AND published_at >= created_at AND retired_at IS NULL AND updated_at >= published_at)
   OR (status = 'RETIRED' AND published_at IS NOT NULL AND published_at >= created_at AND retired_at IS NOT NULL AND retired_at >= published_at AND updated_at >= retired_at))
);
ALTER TABLE care_rule_definitions ADD CONSTRAINT care_rule_definitions_identity_check CHECK (rule_key = 'CR-HTN-FU-001' AND action_type = 'HTN_BP_FOLLOWUP');
ALTER TABLE care_rule_definitions ADD CONSTRAINT care_rule_definitions_version_check CHECK (rule_version COLLATE "C" ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-draft)?$');
ALTER TABLE care_rule_definitions ADD CONSTRAINT care_rule_definitions_definition_check CHECK (public.eh009_is_htn_fu_v1(definition) IS TRUE);
ALTER TABLE care_rule_definitions ADD CONSTRAINT care_rule_definitions_timestamps_check CHECK (updated_at >= created_at);

CREATE FUNCTION eh009_guard_guideline_source() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := clock_timestamp(); NEW.updated_at := NEW.created_at; RETURN NEW;
  END IF;
  IF NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Clinical source is immutable' USING ERRCODE = '23514', CONSTRAINT = 'guideline_sources_write_guard';
  END IF;
  RETURN OLD;
END;
$$;

CREATE FUNCTION eh009_guard_template() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' OR NEW.published_at IS NOT NULL OR NEW.retired_at IS NOT NULL THEN
      RAISE EXCEPTION 'Clinical template must start as DRAFT' USING ERRCODE = '23514', CONSTRAINT = 'care_plan_templates_write_guard';
    END IF;
    NEW.created_at := clock_timestamp(); NEW.updated_at := NEW.created_at; RETURN NEW;
  END IF;
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN OLD; END IF;
  IF ROW(NEW.id, NEW.template_key, NEW.condition_domain, NEW.version, NEW.guideline_source_id, NEW.created_at, NEW.updated_at, NEW.published_at, NEW.retired_at)
     IS DISTINCT FROM ROW(OLD.id, OLD.template_key, OLD.condition_domain, OLD.version, OLD.guideline_source_id, OLD.created_at, OLD.updated_at, OLD.published_at, OLD.retired_at) THEN
    RAISE EXCEPTION 'Clinical template identity and timestamps are immutable' USING ERRCODE = '23514', CONSTRAINT = 'care_plan_templates_write_guard';
  END IF;
  IF OLD.status = 'DRAFT' AND NEW.status = 'DRAFT' THEN
    NEW.updated_at := GREATEST(OLD.updated_at, clock_timestamp()); RETURN NEW;
  END IF;
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION 'Clinical content cannot change during a lifecycle transition' USING ERRCODE = '23514', CONSTRAINT = 'care_plan_templates_write_guard';
  END IF;
  IF OLD.status = 'DRAFT' AND NEW.status = 'PUBLISHED' THEN
    IF NEW.template_key <> 'CPT-HTN-FU-001' OR NEW.version <> '1.0.0-draft'
       OR NEW.name <> 'Controlled uncomplicated hypertension follow-up' OR NEW.condition_domain <> 'HYPERTENSION'
       OR NOT EXISTS (SELECT 1 FROM public.guideline_sources s WHERE s.id = NEW.guideline_source_id
         AND s.source_key = 'WHO-HTN-2021' AND s.title = 'Guideline for the pharmacological treatment of hypertension in adults'
         AND s.publisher = 'World Health Organization' AND s.publication_identity = '2021' AND s.publication_year = 2021
         AND s.reference_identifier = 'ISBN:978-92-4-003398-6' AND s.reference_url IS NULL)
       OR (SELECT count(*) FROM public.care_rule_definitions r WHERE r.template_id = NEW.id) <> 1
       OR NOT EXISTS (SELECT 1 FROM public.care_rule_definitions r WHERE r.template_id = NEW.id
         AND r.rule_key = 'CR-HTN-FU-001' AND r.rule_version = '1.0.0-draft' AND r.action_type = 'HTN_BP_FOLLOWUP'
         AND public.eh009_is_htn_fu_v1(r.definition)) THEN
      RAISE EXCEPTION 'Only the exact approved clinical aggregate may be published' USING ERRCODE = '23514', CONSTRAINT = 'care_plan_templates_publication_guard';
    END IF;
    NEW.published_at := GREATEST(OLD.updated_at, clock_timestamp()); NEW.updated_at := NEW.published_at; RETURN NEW;
  END IF;
  IF OLD.status = 'PUBLISHED' AND NEW.status = 'RETIRED' THEN
    NEW.retired_at := GREATEST(OLD.updated_at, clock_timestamp()); NEW.updated_at := NEW.retired_at; RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Clinical lifecycle or immutable content change rejected' USING ERRCODE = '23514', CONSTRAINT = 'care_plan_templates_write_guard';
END;
$$;

CREATE FUNCTION eh009_guard_rule() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE parent public.care_plan_templates%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW IS NOT DISTINCT FROM OLD THEN RETURN OLD; END IF;
    IF ROW(NEW.id, NEW.template_id, NEW.rule_key, NEW.rule_version, NEW.action_type, NEW.created_at, NEW.updated_at)
       IS DISTINCT FROM ROW(OLD.id, OLD.template_id, OLD.rule_key, OLD.rule_version, OLD.action_type, OLD.created_at, OLD.updated_at) THEN
      RAISE EXCEPTION 'Clinical rule identity is immutable' USING ERRCODE = '23514', CONSTRAINT = 'care_rule_definitions_write_guard';
    END IF;
  END IF;
  -- Serializes every child write with publication/retirement of its exact parent.
  -- A stale REPEATABLE READ/SERIALIZABLE snapshot must serialize or abort, never bypass.
  SELECT * INTO parent FROM public.care_plan_templates WHERE id = NEW.template_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF; -- the named FK rejects the missing parent
  IF parent.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Published clinical rule membership/content is immutable' USING ERRCODE = '23514', CONSTRAINT = 'care_rule_definitions_write_guard';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.guideline_sources WHERE id = parent.guideline_source_id AND source_key = 'WHO-HTN-2021' AND publication_identity = '2021') THEN
    RAISE EXCEPTION 'Clinical rule source identity mismatch' USING ERRCODE = '23514', CONSTRAINT = 'care_rule_definitions_source_guard';
  END IF;
  IF TG_OP = 'INSERT' THEN NEW.created_at := clock_timestamp(); NEW.updated_at := NEW.created_at;
  ELSE NEW.updated_at := GREATEST(OLD.updated_at, clock_timestamp()); END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION eh009_reject_catalog_removal() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Clinical catalog history cannot be removed' USING ERRCODE = '23514', CONSTRAINT = TG_TABLE_NAME || '_removal_guard';
END;
$$;
CREATE TRIGGER guideline_sources_write_guard BEFORE INSERT OR UPDATE ON guideline_sources FOR EACH ROW EXECUTE FUNCTION eh009_guard_guideline_source();
CREATE TRIGGER care_plan_templates_write_guard BEFORE INSERT OR UPDATE ON care_plan_templates FOR EACH ROW EXECUTE FUNCTION eh009_guard_template();
CREATE TRIGGER care_rule_definitions_write_guard BEFORE INSERT OR UPDATE ON care_rule_definitions FOR EACH ROW EXECUTE FUNCTION eh009_guard_rule();
CREATE TRIGGER guideline_sources_removal_guard BEFORE DELETE OR TRUNCATE ON guideline_sources FOR EACH STATEMENT EXECUTE FUNCTION eh009_reject_catalog_removal();
CREATE TRIGGER care_plan_templates_removal_guard BEFORE DELETE OR TRUNCATE ON care_plan_templates FOR EACH STATEMENT EXECUTE FUNCTION eh009_reject_catalog_removal();
CREATE TRIGGER care_rule_definitions_removal_guard BEFORE DELETE OR TRUNCATE ON care_rule_definitions FOR EACH STATEMENT EXECUTE FUNCTION eh009_reject_catalog_removal();
COMMIT;
