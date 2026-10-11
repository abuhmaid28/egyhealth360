# EgyHealth 360 — Product Definition

## Vision

EgyHealth 360 is an intelligent continuity-of-care platform connecting the patient, doctor, laboratory, pharmacy, and administration around one continuous healthcare journey.

The platform is not intended to replace doctors or become a full hospital ERP.

## Problem

Healthcare interactions are often fragmented:

Doctor visit → Lab request → Lab result → Prescription → Pharmacy → Follow-up.

This creates problems such as:

- fragmented medical information,
- missed follow-ups,
- uncompleted lab requests,
- difficulty understanding patient history,
- limited visibility into what should happen next,
- healthcare data being stored without being actively used to support continuity of care.

## Core questions

The product should help answer:

1. What happened to the patient?
2. What should happen next?
3. Has an important care step been missed?

## Product principles

### Connect
Connect the main healthcare journey.

### Understand
Turn healthcare events into a clear longitudinal health timeline.

### Predict
Use responsible AI-assisted risk assessment.

### Follow
Track care plans, follow-ups, and care gaps.

## Users

### Primary
- Patient
- Doctor

### Supporting
- Laboratory
- Pharmacy

### Operational
- Admin

## MVP

### Foundation
- Authentication
- Authorization
- Role-based access

### Patient
- Profile
- Medical profile
- Doctor discovery
- Appointment booking/history
- Medical timeline
- Lab requests/results
- Prescriptions
- Care plans
- Follow-ups
- Measurements
- Care-gap alerts
- Risk-insight view
- Notifications

### Doctor
- Profile
- Availability
- Appointments
- Patient summary
- Medical history
- Clinical encounters
- Diagnoses
- Prescriptions
- Lab requests
- Lab-result review
- Care plans
- Follow-ups
- Care-gap view
- Health trends
- AI-risk review
- Notifications

### Laboratory
- Profile
- Receive/accept requests
- Update request status
- Sample collection
- Structured results
- Reference ranges
- Abnormal flags
- Report attachment
- Result publishing
- Request history

### Pharmacy
- Profile
- Receive authorized prescription
- Medication availability
- Medication-level dispensing
- Partial dispensing
- Prescription history
- Basic refill tracking

### Admin
- User/provider management
- Verification status
- Account suspension/reactivation
- Appointment oversight
- Basic operational analytics
- Care-gap overview
- Audit information
- Basic system settings
- Operational announcements

## Core differentiators

- Health Timeline
- Care Plan
- Follow-up tracking
- Care Gap Detection
- Health Trends
- Explainable AI-assisted risk assessment
- Doctor-in-the-loop

## Initial AI use case

Planned first model:

**Diabetes Risk Assessment**

The final dataset, features, model, and evaluation plan are not frozen yet.

AI must:

- validate required inputs,
- return insufficient-data state when needed,
- generate a risk assessment rather than diagnosis,
- preserve model version and timestamp,
- support understandable explanation,
- remain subject to doctor review.

## Golden demo journey

Patient registers  
→ books doctor  
→ doctor consultation  
→ doctor requests lab tests  
→ patient selects lab  
→ lab publishes structured results  
→ health timeline updates  
→ risk assessment runs when sufficient data exists  
→ doctor reviews assessment  
→ doctor creates care plan  
→ follow-up is scheduled  
→ missed follow-up creates care gap  
→ completed follow-up resolves care gap.

This is the North Star of the MVP.

## Explicit MVP exclusions

- Full hospital ERP
- Full pharmacy e-commerce
- Payments
- Insurance claims
- Ambulance management
- Advanced medical chatbot
- Automated diagnosis
- Automated treatment
- Medical-image diagnosis
- X-ray / CT classification
- Handwritten prescription OCR
- Wearable integration
- Apple Health / Google Fit integration
- Full video-consultation infrastructure
- Hospital admission management
- Nationwide healthcare integration
- Blockchain
- Full laboratory ERP
- Pharmacy supplier management
- Advanced inventory management

## Product success

The MVP succeeds when the connected healthcare journey works reliably end-to-end with correct authorization, data integrity, care continuity, and responsible AI integration.

Screen count and number of AI models are not success metrics.
