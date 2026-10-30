/** Remove exactly the appended Slice 3 path/schema blocks without reserializing
 * numeric response keys or historical escapes. Current full-file hash and exact
 * new inventories are pinned independently in patient-entry.test.mjs. */
export function beforeSlice3(text) {
 return beforeSlice4(text)
  .replace(/,\n {4}"\/api\/v1\/auth\/register": [\s\S]*?(?=\n {2}},\n {2}"components")/,'')
  .replace(/,\n {6}"PatientRegistrationRequest": [\s\S]*?(?=\n {4}}\n {2}}\n}\n$)/,'');
}

/** Strip only the appended Slice 4 blocks; independent tests pin the complete
 * current file and the exact pre-Slice-4 bytes, routes and schema inventories. */
export function beforeSlice4(text) {
 return beforeSlice5(text)
  .replace(/,\n {4}"\/api\/v1\/directory\/specialties": [\s\S]*?(?=\n {2}},\n {2}"components")/,'')
  .replace(/,\n {6}"PublicDirectorySpecialty": [\s\S]*?(?=\n {4}}\n {2}}\n}\n$)/,'');
}

/** Slice 5 appends participant-only enrollment paths/schemas, no historical edits. */
export function beforeSlice5(text) {
 return beforeI2Slice2(text)
  .replace(/,\n {4}"\/api\/v1\/me\/relationship-requests": [\s\S]*?(?=\n {2}},\n {2}"components")/,'')
  .replace(/,\n {6}"RelationshipAuthorization": [\s\S]*?(?=\n {4}}\n {2}}\n}\n$)/,'');
}

/** Strip only the exact appended I2 Slice 2 blocks; old hashes remain pinned. */
export function beforeI2Slice2(text) {
 return beforeI2Slice3(text)
  .replace(/,\n {4}"\/api\/v1\/directory\/providers\/\{publicId\}\/availability": [\s\S]*?(?=\n {2}},\n {2}"components")/,'')
  .replace(/,\n {6}"AvailabilityPublish": [\s\S]*?(?=\n {4}}\n {2}}\n}\n$)/,'');
}

/** Strip only appended Booking lifecycle blocks; old bytes remain hash-pinned. */
export function beforeI2Slice3(text) {
 return beforeI2Slice4(text).replace(/,\n {4}"\/api\/v1\/me\/bookings": [\s\S]*?(?=\n {2}},\n {2}"components")/,'')
 .replace(/,\n {6}"BookingCreate": [\s\S]*?(?=\n {4}}\n {2}}\n}\n$)/,'');
}

/** Exactly remove Slice 4 additions and its two additive booking enum extensions.
 * All earlier contract byte hashes remain asserted; no legacy API is widened. */
export function beforeI2Slice4(text) {
 return beforeI2Slice5(text).replace(/,\n {4}"\/api\/v1\/me\/bookings\/\{bookingId\}\/consultation": [\s\S]*?(?=\n {2}},\n {2}"components")/,'')
 .replace(/,\n {6}"ConsultationOpen": [\s\S]*?(?=\n {4}}\n {2}}\n}\n$)/,'')
 .replace(/"CORRECT",\n {14}"OPEN"/g,'"CORRECT"')
 .replace(/"NO_SHOW",\n {14}"IN_CONSULTATION"/g,'"NO_SHOW"');
}

/** Exactly strip Slice 5 additions; all historical byte hashes remain pinned. */
export function beforeI2Slice5(text) {
 return text.replace(/,\n {4}"\/api\/v1\/consultations\/\{consultationId\}\/documents": [\s\S]*?(?=\n {2}},\n {2}"components")/,'')
 .replace(/,\n {6}"DocumentationAllergyReview": [\s\S]*?(?=\n {4}}\n {2}}\n}\n$)/,'');
}
