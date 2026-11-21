# Doctor Schedule acceptance index

**Owner visual acceptance pending.**

Scope is the exact six-file Demo-only clinician Schedule pilot for `/doctor/schedule`. Source identity and the complete changed-file list are in [source-manifest.json](source-manifest.json). The published recovery checkpoint stays at the baseline below.

- Baseline HEAD: `7b5973b85a458d6603ca944b401f6444985244ed`
- Candidate HEAD: `a109ba67bcf4c8466421f92f4a8d67b8ca1a6b89`
- Candidate tree: `5765ba6c2cf9e33126a115678892ee9e012fa379`
- Chain: baseline → `b32940e72856196372d88a0432539055f8c9546e` → `384996ae16f47f1d2b7f9fa47c75e81dcbff48d5` → candidate

[Validation receipt](validation-receipt.json) · [UX/accessibility review](ux-independent-review.md) · [Security/clinical/privacy review](security-independent-review.md) · [Full image manifest](image-manifest.json)

The Schedule uses appointment-local 24-hour formatting and preserves the booking resource, filters and source order. The appointment action opens logistics details. Booking alone grants zero clinical authority. The third metric is the total returned schedule rows before display filtering, labelled **Patient appointments / مواعيد المرضى**.

## Like-for-like before and after

| Locale and CSS viewport width | Before · System/light | After · System/light | After · System/dark |
| --- | --- | --- | --- |
| EN · 390px | [PNG](images/before-en-390.png) | [PNG](images/after-en-light-390.png) | [PNG](images/after-en-dark-390.png) |
| EN · 1440px | [PNG](images/before-en-1440.png) | [PNG](images/after-en-light-1440.png) | [PNG](images/after-en-dark-1440.png) |
| AR · 390px | [PNG](images/before-ar-390.png) | [PNG](images/after-ar-light-390.png) | [PNG](images/after-ar-dark-390.png) |
| AR · 1440px | [PNG](images/before-ar-1440.png) | [PNG](images/after-ar-light-1440.png) | [PNG](images/after-ar-dark-1440.png) |


- Native 200% page zoom: [EN](images/zoom-en.png) · [AR](images/zoom-ar.png)
- Separate 200% text and Forced Colors: [EN](images/text-200-en.png) · [AR](images/text-200-ar.png)

The evidence commit preserves the six-file candidate as its parent. For receiver verification, compare the recovery baseline to the candidate and check all 16 originals against images.sha256. F06/E2 remains NO-GO.
