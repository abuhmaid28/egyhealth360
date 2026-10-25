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
 return text
  .replace(/,\n {4}"\/api\/v1\/directory\/specialties": [\s\S]*?(?=\n {2}},\n {2}"components")/,'')
  .replace(/,\n {6}"PublicDirectorySpecialty": [\s\S]*?(?=\n {4}}\n {2}}\n}\n$)/,'');
}
