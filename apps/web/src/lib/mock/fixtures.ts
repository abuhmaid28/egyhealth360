import type {
  Availability,
  Clinic,
  Consultation,
  Operations,
  Profile,
  Provider,
  Specialty,
} from "../api/contracts";
export const DEMO_DATE = "2026-10-28";
export const specialties: Specialty[] = [
  { key: "internal-medicine", displayName: "Internal medicine" },
  { key: "cardiology", displayName: "Cardiology" },
  { key: "dermatology", displayName: "Dermatology" },
];
export const clinics: Clinic[] = [
  {
    id: "cairo-clinic",
    displayName: "Nile Care Clinic",
    city: "Cairo",
    address: "24 El Tahrir Street, Dokki, Cairo",
  },
  {
    id: "new-cairo",
    displayName: "Eastside Medical Center",
    city: "New Cairo",
    address: "18 South 90th Street, New Cairo",
  },
];
export const providers: Provider[] = [
  {
    id: "mariam-hassan",
    displayName: "Dr. Mariam Hassan",
    specialty: specialties[0],
    clinics: [clinics[0]],
  },
  {
    id: "omar-khaled",
    displayName: "Dr. Omar Khaled",
    specialty: specialties[1],
    clinics: [clinics[1]],
  },
  {
    id: "sara-adel",
    displayName: "Dr. Sara Adel",
    specialty: specialties[2],
    clinics: [clinics[0]],
  },
];
export const profile: Profile = {
  id: "demo-patient",
  displayName: "Ahmed Mostafa",
  dateOfBirth: "1992-04-12",
  sex: "MALE",
};
export const slots: Availability[] = providers.flatMap((p, i) =>
  [9, 10, 11, 13, 14, 15]
    .map((h) => ({
      id: `${p.id}-${h}`,
      providerId: p.id,
      clinicId: p.clinics[0].id,
      startAt: `2026-10-28T${String(h).padStart(2, "0")}:00:00+03:00`,
      endAt: `2026-10-28T${String(h).padStart(2, "0")}:30:00+03:00`,
      timeZone: "Africa/Cairo",
      bookable: !(i === 1 && h === 10),
    }))
    .filter((s) => s.bookable),
);
export const blankConsultation = (appointmentId: string): Consultation => ({
  appointmentId,
  complaint: "",
  diagnosis: "",
  allergies: "Not yet reviewed",
  notes: "",
  medication: "",
  dosage: "",
  lab: "",
  instructions: "",
  followUp: "",
  released: false,
});
export const previous: Consultation = {
  appointmentId: "previous-visit",
  complaint: "Routine wellness review",
  diagnosis: "Wellness review",
  allergies: "Patient reports no known allergies",
  notes: "Private synthetic note",
  medication: "",
  dosage: "",
  lab: "",
  instructions: "Keep a record of your questions for your next visit.",
  followUp: "Discuss at the next visit",
  released: true,
};
export const operations: Operations = {
  organizations: [
    { name: clinics[0].displayName, kind: "Clinic", status: "Active" },
    { name: clinics[1].displayName, kind: "Clinic", status: "Active" },
    { name: "Nile Diagnostics", kind: "Laboratory", status: "Active" },
    { name: "CarePoint Pharmacy", kind: "Pharmacy", status: "Active" },
  ],
  users: [
    { name: profile.displayName, role: "Patient", status: "Active" },
    { name: providers[0].displayName, role: "Clinician", status: "Active" },
    { name: "Hana Ali", role: "Lab staff", status: "Active" },
    { name: "Youssef Salem", role: "Pharmacy staff", status: "Active" },
  ],
};
