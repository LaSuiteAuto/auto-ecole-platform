import { z } from "zod";

// On reproduit les Enums du Backend pour être cohérent
export const LicenseTypeEnum = z.enum(["B", "AAC", "CS", "A1", "A2"]);
export type LicenseType = z.infer<typeof LicenseTypeEnum>;

// Fonction pour calculer l'âge
const calculateAge = (birthDateStr: string): number => {
  if (!birthDateStr) return 18;
  const today = new Date();
  const birth = new Date(birthDateStr);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Le Schéma de validation avec validation conditionnelle pour mineurs
export const createStudentSchema = z.object({
  // --- User Info ---
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide"),

  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),

  // --- État Civil ---
  birthName: z
    .string()
    .min(2, "Le nom de naissance doit contenir au moins 2 caractères"),
    
  firstName: z
    .string()
    .min(2, "Le prénom doit contenir au moins 2 caractères"),

  birthDate: z
    .string()
    .min(1, "La date de naissance est requise")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Date de naissance invalide",
    }),

  birthCity: z.string().min(1, "La ville de naissance est requise"),

  birthZipCode: z.string().optional(),

  birthCountry: z.string().min(1, "Le pays de naissance est requis"),

  // --- Adresse ---
  address: z.string().min(5, "L'adresse est trop courte"),
  city: z.string().min(1, "La ville est requise"),
  zipCode: z
    .string()
    .regex(/^\d{5}$/, "Le code postal doit contenir 5 chiffres"),

  phone: z
    .string()
    .min(10, "Numéro trop court")
    .max(14, "Numéro trop long")
    .regex(/^[0-9+ ]+$/, "Le numéro ne doit contenir que des chiffres"),

  // --- Métier ---
  licenseType: LicenseTypeEnum,
  hoursPurchased: z.number().min(0, "Le nombre d'heures doit être positif").optional().or(z.literal(0)),

  // --- Documents ANTS ---
  neph: z.string().optional(),
  ePhotoCode: z.string().optional(),
  hasIdCard: z.boolean().optional(),
  hasProofOfAddress: z.boolean().optional(),
  hasAssr2: z.boolean().optional(),
  hasJdcCertificate: z.boolean().optional(),
  hasCensusCertificate: z.boolean().optional(),
  needsMedicalOpinion: z.boolean().optional(),
  hasMedicalOpinion: z.boolean().optional(),
  
  // --- Représentant légal (optionnel, pour mineurs) ---
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().optional(),
  guardianRelation: z.string().optional(),
}).superRefine((data, ctx) => {
  const age = calculateAge(data.birthDate);
  if (age < 18) {
    if (!data.guardianName || data.guardianName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le nom du représentant légal est requis pour un mineur",
        path: ["guardianName"],
      });
    }
    if (!data.guardianPhone || data.guardianPhone.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le téléphone du représentant légal est requis pour un mineur",
        path: ["guardianPhone"],
      });
    }
  }
});

// MAGIE : On génère le Type TypeScript automatiquement à partir du schéma
export type CreateStudentFormValues = z.infer<typeof createStudentSchema>;