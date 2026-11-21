# Doctor Operations Sprint S1 acceptance index

**Owner visual acceptance pending.**

Scope is the exact six-file Demo-only clinician UI improvement lane for `DoctorAvailability` (`/doctor/availability`) and `PatientAppointment` (`/doctor/appointments/:id`). Source identity and the complete changed-file allowlist are recorded in [source-manifest.json](source-manifest.json). The baseline candidate `evidence/135-doctor-schedule-a109ba6` (`e07e0ae74b1fa6f709448a0305121e6f7663c2c9`) and `docs/visual-evidence/135/doctor-schedule-a109ba6/**` remain completely untouched.

- Baseline HEAD: `e07e0ae74b1fa6f709448a0305121e6f7663c2c9` (tree `adbb786a252da2ec20cedf4a43c5cec9a67ff88b`)
- Source Candidate HEAD: `f6326b9a04830ca1dbf1099750ed4340810d49b0`
- Source Candidate tree: `344ef5711dfff7a10da21d5d8df693d5cdcf67cb`

[Validation receipt](validation-receipt.json) · [Focused browser receipt](focused-receipt.json) · [Independent review](independent-review.md) · [Full image manifest](image-manifest.json) · [SHA-256 checksums](images.sha256)

Expressive Demo styling (`data-expressive-doctor-availability` and `data-expressive-doctor-appointment`) mounts strictly when `api.mode === "demo" && session.mode === "demo" && session.role === "CLINICIAN"` (and `booking.implementation === "demo"` for appointments). All Live endpoints, Live JSX, `PublicAvailability`, `Pagination`, `ExpressiveSchedule`, `Schedule`, `Workspace`, and `apps/web/src/lib/**` remain byte-identical to `e07e0ae7`.

## Like-for-like before and after — Doctor Availability (`/doctor/availability`)

| Locale and CSS viewport width | Before · System/light | After · System/light | After · System/dark |
| --- | --- | --- | --- |
| EN · 390px | [PNG](images/avail-before-en-390.png) | [PNG](images/avail-after-en-light-390.png) | [PNG](images/avail-after-en-dark-390.png) |
| EN · 1440px | [PNG](images/avail-before-en-1440.png) | [PNG](images/avail-after-en-light-1440.png) | [PNG](images/avail-after-en-dark-1440.png) |
| AR · 390px | [PNG](images/avail-before-ar-390.png) | [PNG](images/avail-after-ar-light-390.png) | [PNG](images/avail-after-ar-dark-390.png) |
| AR · 1440px | [PNG](images/avail-before-ar-1440.png) | [PNG](images/avail-after-ar-light-1440.png) | [PNG](images/avail-after-ar-dark-1440.png) |

- Native 200% page zoom: [EN](images/avail-zoom-en.png) · [AR](images/avail-zoom-ar.png)
- Separate 200% text and Forced Colors: [EN](images/avail-text-200-en.png) · [AR](images/avail-text-200-ar.png)

## Like-for-like before and after — Doctor Appointment Details (`/doctor/appointments/:id`)

| Locale and CSS viewport width | Before · System/light | After · System/light | After · System/dark |
| --- | --- | --- | --- |
| EN · 390px | [PNG](images/appt-before-en-390.png) | [PNG](images/appt-after-en-light-390.png) | [PNG](images/appt-after-en-dark-390.png) |
| EN · 1440px | [PNG](images/appt-before-en-1440.png) | [PNG](images/appt-after-en-light-1440.png) | [PNG](images/appt-after-en-dark-1440.png) |
| AR · 390px | [PNG](images/appt-before-ar-390.png) | [PNG](images/appt-after-ar-light-390.png) | [PNG](images/appt-after-ar-dark-390.png) |
| AR · 1440px | [PNG](images/appt-before-ar-1440.png) | [PNG](images/appt-after-ar-light-1440.png) | [PNG](images/appt-after-ar-dark-1440.png) |

- Native 200% page zoom: [EN](images/appt-zoom-en.png) · [AR](images/appt-zoom-ar.png)
- Separate 200% text and Forced Colors: [EN](images/appt-text-200-en.png) · [AR](images/appt-text-200-ar.png)

Check all 32 PNG originals against `images.sha256` (`sha256sum -c images.sha256`). F06/E2 remains NO-GO.
