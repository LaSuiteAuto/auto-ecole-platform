"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import api from "@/lib/api";

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

// Schéma de validation pour l'édition avec validation conditionnelle pour mineurs
const updateStudentSchema = z.object({
  birthName: z.string().min(2, "Minimum 2 caractères"),
  firstName: z.string().min(2, "Minimum 2 caractères"),
  birthDate: z.string().min(1, "Requis"),
  birthCity: z.string().min(1, "Requis"),
  birthZipCode: z.string().nullable().optional(),
  birthCountry: z.string().min(1, "Requis"),
  address: z.string().min(5, "Minimum 5 caractères"),
  city: z.string().min(1, "Requis"),
  zipCode: z.string().regex(/^\d{5}$/, "5 chiffres"),
  phone: z.string().min(10, "Minimum 10 caractères"),
  licenseType: z.enum(["B", "AAC", "CS", "A1", "A2"]),
  status: z.enum(["PROSPECT", "ANTS_PROCESSING", "ACTIVE", "EXAM_READY", "LICENSE_OBTAINED", "ARCHIVED"]),
  hoursPurchased: z.number().min(0, "Le nombre d'heures doit être positif").optional().or(z.literal(0)),
  neph: z.string().nullable().optional(),
  ePhotoCode: z.string().nullable().optional(),
  hasIdCard: z.boolean().optional(),
  hasProofOfAddress: z.boolean().optional(),
  hasAssr2: z.boolean().optional(),
  hasJdcCertificate: z.boolean().optional(),
  hasCensusCertificate: z.boolean().optional(),
  needsMedicalOpinion: z.boolean().optional(),
  hasMedicalOpinion: z.boolean().optional(),
  guardianName: z.string().nullable().optional(),
  guardianPhone: z.string().nullable().optional(),
  guardianEmail: z.string().nullable().optional(),
  guardianRelation: z.string().nullable().optional(),
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

type UpdateStudentFormValues = z.infer<typeof updateStudentSchema>;

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [birthDate, setBirthDate] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateStudentFormValues>({
    resolver: zodResolver(updateStudentSchema),
  });

  // Charger les données de l'élève
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/students/${studentId}`);
        const data = res.data;
        
        // Formater la date pour l'input date
        const formattedDate = data.birthDate.split("T")[0];
        setBirthDate(formattedDate);
        
        const formattedData = {
          ...data,
          birthDate: formattedDate,
          hoursPurchased: data.minutesPurchased ? data.minutesPurchased / 60 : 0,
        };
        
        reset(formattedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [studentId, reset]);

  const onError = (formErrors: Record<string, { message?: string }>) => {
    console.log("Erreurs de validation:", formErrors);
    const errorMessages = Object.entries(formErrors)
      .map(([field, error]) => `${field}: ${error.message || 'Erreur'}`)
      .join(", ");
    setMessage({ type: "error", text: `Erreurs de validation: ${errorMessages}` });
  };

  const onSubmit = async (data: UpdateStudentFormValues) => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Formater le téléphone au format international si nécessaire
      let formattedPhone = data.phone;
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+33" + formattedPhone.slice(1);
      }

      // Nettoyer les champs vides pour éviter les erreurs de validation
      const cleanedData: Partial<UpdateStudentFormValues> & { minutesPurchased?: number } = {
        ...data,
        phone: formattedPhone,
        minutesPurchased: data.hoursPurchased ? data.hoursPurchased * 60 : undefined,
        birthZipCode: data.birthZipCode || undefined,
        neph: data.neph || undefined,
        ePhotoCode: data.ePhotoCode || undefined,
        guardianName: data.guardianName || undefined,
        guardianPhone: data.guardianPhone || undefined,
        guardianEmail: data.guardianEmail || undefined,
        guardianRelation: data.guardianRelation || undefined,
      };
      
      // Supprimer hoursPurchased car le backend attend minutesPurchased
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hoursPurchased: _hours, ...dataToSend } = cleanedData;

      await api.put(`/students/${studentId}`, dataToSend);

      setMessage({ type: "success", text: "Élève mis à jour avec succès !" });
      
      // Redirection après 1.5s
      setTimeout(() => {
        router.push(`/dashboard/students/${studentId}`);
      }, 1500);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>
        <Link href="/dashboard/students" className="text-blue-600 mt-4 inline-block">
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  const isMinor = calculateAge(birthDate) < 18;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white text-black">
      <Link href={`/dashboard/students/${studentId}`} className="text-blue-600 text-sm hover:underline">
        ← Retour au profil
      </Link>
      <h1 className="text-2xl font-bold mb-6 mt-2">Modifier l&apos;élève</h1>

      {message && (
        <div
          className={`p-4 mb-4 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {/* État Civil */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">État Civil</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom de naissance *</label>
              <input {...register("birthName")} className="w-full border rounded px-3 py-2" />
              {errors.birthName && <p className="text-red-500 text-sm">{errors.birthName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prénom *</label>
              <input {...register("firstName")} className="w-full border rounded px-3 py-2" />
              {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de naissance *</label>
              <input 
                type="date" 
                {...register("birthDate")} 
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full border rounded px-3 py-2" 
              />
              {errors.birthDate && <p className="text-red-500 text-sm">{errors.birthDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville de naissance *</label>
              <input {...register("birthCity")} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code postal naissance</label>
              <input {...register("birthZipCode")} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pays de naissance</label>
              <input {...register("birthCountry")} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
        </fieldset>

        {/* Adresse */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">Adresse</legend>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Adresse *</label>
              <input {...register("address")} className="w-full border rounded px-3 py-2" />
              {errors.address && <p className="text-red-500 text-sm">{errors.address.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville *</label>
              <input {...register("city")} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code postal *</label>
              <input {...register("zipCode")} className="w-full border rounded px-3 py-2" />
              {errors.zipCode && <p className="text-red-500 text-sm">{errors.zipCode.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Téléphone *</label>
              <input {...register("phone")} className="w-full border rounded px-3 py-2" />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
            </div>
          </div>
        </fieldset>

        {/* Formation */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">Formation</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type de permis</label>
              <select {...register("licenseType")} className="w-full border rounded px-3 py-2">
                <option value="B">B - Voiture</option>
                <option value="AAC">AAC - Conduite accompagnée</option>
                <option value="CS">CS - Conduite supervisée</option>
                <option value="A1">A1 - Moto légère</option>
                <option value="A2">A2 - Moto intermédiaire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Heures achetées</label>
              <input
                type="number"
                {...register("hoursPurchased", { valueAsNumber: true })}
                className="w-full border rounded px-3 py-2"
                min="0"
                step="0.5"
              />
              {errors.hoursPurchased && (
                <p className="text-red-500 text-sm">{errors.hoursPurchased.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Statut</label>
              <select {...register("status")} className="w-full border rounded px-3 py-2">
                <option value="PROSPECT">Prospect</option>
                <option value="ANTS_PROCESSING">En cours ANTS</option>
                <option value="ACTIVE">Actif</option>
                <option value="EXAM_READY">Prêt examen</option>
                <option value="LICENSE_OBTAINED">Permis obtenu</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Documents ANTS */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">Documents ANTS</legend>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Numéro NEPH</label>
              <input {...register("neph")} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code e-photo</label>
              <input {...register("ePhotoCode")} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <p className="text-sm font-medium mb-3">Documents fournis :</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("hasIdCard")} className="w-4 h-4" />
              Carte d&apos;identité
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("hasProofOfAddress")} className="w-4 h-4" />
              Justificatif de domicile
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("hasAssr2")} className="w-4 h-4" />
              ASSR2
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("hasJdcCertificate")} className="w-4 h-4" />
              Certificat JDC
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("hasCensusCertificate")} className="w-4 h-4" />
              Attestation de recensement
            </label>
          </div>
          <div className="mt-4 pt-4 border-t">
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" {...register("needsMedicalOpinion")} className="w-4 h-4" />
              Avis médical nécessaire
            </label>
            <label className="flex items-center gap-2 ml-6">
              <input type="checkbox" {...register("hasMedicalOpinion")} className="w-4 h-4" />
              Avis médical fourni
            </label>
          </div>
        </fieldset>

        {/* Représentant légal (si mineur) */}
        {isMinor && (
          <fieldset className="border p-4 rounded bg-yellow-50">
            <legend className="font-semibold px-2">Représentant Légal (Élève mineur)</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input {...register("guardianName")} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Relation</label>
                <input {...register("guardianRelation")} className="w-full border rounded px-3 py-2" placeholder="Père, Mère, Tuteur..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input {...register("guardianPhone")} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" {...register("guardianEmail")} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
          </fieldset>
        )}

        {/* Boutons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
          <Link
            href={`/dashboard/students/${studentId}`}
            className="px-6 py-3 border rounded text-gray-700 hover:bg-gray-50 text-center"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
