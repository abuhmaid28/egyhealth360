# EgyHealth 360 — Conceptual Data Model

This document defines the conceptual relational model.
It is not executable SQL.

## Identity

### users
- id
- email (unique)
- password_hash
- role
- status
- created_at
- updated_at

### patient_profiles
- id
- user_id (unique FK)
- full_name
- date_of_birth
- gender
- phone
- governorate
- emergency_contact

### patient_allergies
- id
- patient_id
- allergy_name
- notes
- source
- verified_by_doctor_id
- created_at

### patient_conditions
- id
- patient_id
- condition_name
- notes
- source
- verified_by_doctor_id
- created_at

### doctor_profiles
- id
- user_id (unique FK)
- full_name
- specialty_id
- biography
- years_experience
- governorate
- clinic_address
- verification_status

### specialties
- id
- name (unique)

### lab_profiles
- id
- user_id (unique FK)
- name
- phone
- governorate
- address
- verification_status

### pharmacy_profiles
- id
- user_id (unique FK)
- name
- phone
- governorate
- address
- verification_status

### consent_records
- id
- patient_id
- consent_type
- version
- accepted_at
- revoked_at

## Scheduling

### availability_rules
- id
- doctor_id
- weekday
- start_time
- end_time
- slot_duration_minutes
- is_active

### schedule_exceptions
- id
- doctor_id
- date
- type
- start_time
- end_time
- reason

### appointments
- id
- patient_id
- doctor_id
- start_at
- end_at
- status
- created_at
- cancelled_at
- cancellation_reason

Important constraint:
A doctor must not have overlapping active appointments.

## Clinical

### encounters
- id
- appointment_id (unique FK)
- status
- chief_complaint
- symptoms
- clinical_notes
- assessment
- started_at
- completed_at

### diagnoses
- id
- encounter_id
- diagnosis_name
- notes
- created_at

### prescriptions
- id
- encounter_id
- status
- issued_at
- valid_until
- assigned_pharmacy_id

### prescription_items
- id
- prescription_id
- medication_name
- dose
- frequency
- duration
- instructions
- fulfillment_status

### dispensing_records
- id
- prescription_item_id
- pharmacy_id
- quantity
- dispensed_at

## Laboratory

### lab_test_catalog
- id
- name
- default_unit

### lab_orders
- id
- encounter_id
- assigned_lab_id
- status
- priority
- doctor_notes
- requested_at

### lab_order_items
- id
- lab_order_id
- lab_test_id

### lab_results
- id
- lab_order_item_id
- lab_id
- numeric_value
- text_value
- unit
- reference_low
- reference_high
- flag
- report_file_url
- published_at
- supersedes_result_id
- created_at

## Continuity

### care_plans
- id
- patient_id
- doctor_id
- title
- description
- status
- start_date
- end_date
- created_at

### care_plan_tasks
- id
- care_plan_id
- title
- description
- due_date
- status
- completed_at

### follow_ups
- id
- patient_id
- doctor_id
- source_encounter_id
- care_plan_id
- due_at
- reason
- status
- completed_appointment_id

### health_measurements
- id
- patient_id
- type
- value_primary
- value_secondary
- unit
- source
- recorded_at
- created_by_user_id

### care_gaps
- id
- patient_id
- type
- status
- follow_up_id
- lab_order_id
- lab_result_id
- detected_at
- resolved_at
- dismissed_at
- dismissal_reason

Exactly one relevant source should be populated for a care-gap type.

## Intelligence

### risk_assessments
- id
- patient_id
- type
- status
- score
- risk_level
- model_version
- explanation
- created_at
- reviewed_by_doctor_id
- reviewed_at
- review_note

## System

### notifications
- id
- user_id
- type
- title
- message
- read_at
- created_at

### audit_logs
- id
- actor_user_id
- action
- resource_type
- resource_id
- metadata
- created_at

## Likely important indexes

- users.email
- appointments(doctor_id, start_at)
- appointments(patient_id, start_at)
- encounters.appointment_id
- lab_orders(assigned_lab_id, status)
- lab_results.lab_order_item_id
- care_plans(patient_id, status)
- follow_ups(patient_id, due_at)
- care_gaps(patient_id, status)
- health_measurements(patient_id, recorded_at)
- risk_assessments(patient_id, created_at)
- notifications(user_id, read_at)

Final constraints and indexes are frozen during executable schema implementation.
