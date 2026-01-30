"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createStudentSchema,
  CreateStudentFormValues,
} from "@/lib/validators/student.schema";
import { useState } from "react";
import api from "@/lib/api";

export default function NewStudentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [birthDate, setBirthDate] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateStudentFormValues>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      birthCountry: "FRANCE",
      licenseType: "B",
    },
  });

  const onSubmit = async (data: CreateStudentFormValues) => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Formater le téléphone au format international si nécessaire
      let formattedPhone = data.phone;
      if (formattedPhone && formattedPhone.startsWith("0")) {
        formattedPhone = "+33" + formattedPhone.slice(1);
      }

      // Convertir les heures en minutes pour le backend
      const payload = {
        ...data,
        phone: formattedPhone,
        minutesPurchased: data.hoursPurchased ? Math.round(data.hoursPurchased * 60) : 0,
        // Nettoyer les champs vides pour éviter les erreurs de validation
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
      const { hoursPurchased: _hours, ...dataToSend } = payload;
      
      console.log("Payload envoyé:", dataToSend);
      
      await api.post("/students", dataToSend);
      setMessage({ type: "success", text: "Élève créé avec succès !" });
      reset();
    } catch (error: unknown) {
      console.error("Erreur complète:", error);
      
      let errorMessage = "Erreur inconnue";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string | string[] } }; message?: string };
        console.error("Réponse du serveur:", axiosError.response?.data);
        const msg = axiosError.response?.data?.message;
        errorMessage = Array.isArray(msg) ? msg.join(", ") : (msg || axiosError.message || "Erreur inconnue");
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculer l'âge de l'élève
  const calculateAge = (date: string): number => {
    if (!date) return 18;
    const today = new Date();
    const birth = new Date(date);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const isMinor = calculateAge(birthDate) < 18;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white text-black">
      <h1 className="text-2xl font-bold mb-6 text-black">Nouvel Élève</h1>

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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* === COMPTE === */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2 text-gray-900">Compte</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Email *</label>
              <input
                type="email"
                {...register("email")}
                className="w-full border rounded px-3 py-2"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Mot de passe *</label>
              <input
                type="password"
                {...register("password")}
                className="w-full border rounded px-3 py-2"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* === ÉTAT CIVIL === */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2 text-gray-900">État Civil</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Nom de naissance *</label>
              <input
                type="text"
                {...register("birthName")}
                className="w-full border rounded px-3 py-2"
              />
              {errors.birthName && (
                <p className="text-red-500 text-sm mt-1">{errors.birthName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Prénom *</label>
              <input
                type="text"
                {...register("firstName")}
                className="w-full border rounded px-3 py-2"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Date de naissance *</label>
              <input
                type="date"
                {...register("birthDate")}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              {errors.birthDate && (
                <p className="text-red-500 text-sm mt-1">{errors.birthDate.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Ville de naissance *</label>
              <input
                type="text"
                {...register("birthCity")}
                className="w-full border rounded px-3 py-2"
              />
              {errors.birthCity && (
                <p className="text-red-500 text-sm mt-1">{errors.birthCity.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Code postal naissance</label>
              <input
                type="text"
                {...register("birthZipCode")}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Pays de naissance</label>
              <input
                type="text"
                {...register("birthCountry")}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </fieldset>

        {/* === ADRESSE === */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2 text-gray-900">Adresse</legend>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1 text-gray-900">Adresse *</label>
              <input
                type="text"
                {...register("address")}
                className="w-full border rounded px-3 py-2"
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Ville *</label>
              <input
                type="text"
                {...register("city")}
                className="w-full border rounded px-3 py-2"
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Code postal *</label>
              <input
                type="text"
                {...register("zipCode")}
                className="w-full border rounded px-3 py-2"
              />
              {errors.zipCode && (
                <p className="text-red-500 text-sm mt-1">{errors.zipCode.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Téléphone *</label>
              <input
                type="tel"
                {...register("phone")}
                className="w-full border rounded px-3 py-2"
                placeholder="0612345678"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* === FORMATION === */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2 text-gray-900">Formation</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Type de permis *</label>
              <select
                {...register("licenseType")}
                className="w-full border rounded px-3 py-2"
              >
                <option value="B">B - Voiture</option>
                <option value="AAC">AAC - Conduite accompagnée</option>
                <option value="CS">CS - Conduite supervisée</option>
                <option value="A1">A1 - Moto légère</option>
                <option value="A2">A2 - Moto intermédiaire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Heures achetées</label>
              <input
                type="number"
                {...register("hoursPurchased", { valueAsNumber: true })}
                className="w-full border rounded px-3 py-2"
                placeholder="20"
                min="0"
                step="0.5"
              />
              {errors.hoursPurchased && (
                <p className="text-red-500 text-sm mt-1">{errors.hoursPurchased.message}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* === DOCUMENTS ANTS === */}
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2 text-gray-900">Documents ANTS</legend>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Numéro NEPH</label>
              <input
                type="text"
                {...register("neph")}
                className="w-full border rounded px-3 py-2"
                placeholder="12 chiffres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Code e-photo</label>
              <input
                type="text"
                {...register("ePhotoCode")}
                className="w-full border rounded px-3 py-2"
                placeholder="Code de la photo numérique"
              />
            </div>
          </div>

          <p className="text-sm font-medium text-gray-900 mb-3">Documents fournis :</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-gray-900">
              <input type="checkbox" {...register("hasIdCard")} className="w-4 h-4" />
              <span>Carte d&apos;identité</span>
            </label>
            <label className="flex items-center gap-2 text-gray-900">
              <input type="checkbox" {...register("hasProofOfAddress")} className="w-4 h-4" />
              <span>Justificatif de domicile</span>
            </label>
            <label className="flex items-center gap-2 text-gray-900">
              <input type="checkbox" {...register("hasAssr2")} className="w-4 h-4" />
              <span>ASSR2</span>
            </label>
            <label className="flex items-center gap-2 text-gray-900">
              <input type="checkbox" {...register("hasJdcCertificate")} className="w-4 h-4" />
              <span>Certificat JDC</span>
            </label>
            <label className="flex items-center gap-2 text-gray-900">
              <input type="checkbox" {...register("hasCensusCertificate")} className="w-4 h-4" />
              <span>Attestation de recensement</span>
            </label>
          </div>

          <div className="mt-4 pt-4 border-t">
            <label className="flex items-center gap-2 text-gray-900 mb-2">
              <input type="checkbox" {...register("needsMedicalOpinion")} className="w-4 h-4" />
              <span>Avis médical nécessaire</span>
            </label>
            <label className="flex items-center gap-2 text-gray-900 ml-6">
              <input type="checkbox" {...register("hasMedicalOpinion")} className="w-4 h-4" />
              <span>Avis médical fourni</span>
            </label>
          </div>
        </fieldset>

        {/* === REPRÉSENTANT LÉGAL (si mineur) === */}
        {isMinor && (
          <fieldset className="border p-4 rounded bg-yellow-50">
            <legend className="font-semibold px-2 text-gray-900">Représentant Légal (Élève mineur)</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Nom du représentant</label>
                <input
                  type="text"
                  {...register("guardianName")}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Relation</label>
                <input
                  type="text"
                  {...register("guardianRelation")}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Père, Mère, Tuteur..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Téléphone</label>
                <input
                  type="tel"
                  {...register("guardianPhone")}
                  className="w-full border rounded px-3 py-2"
                  placeholder="0612345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Email</label>
                <input
                  type="email"
                  {...register("guardianEmail")}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </fieldset>
        )}

        {/* === BOUTON === */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Création en cours..." : "Créer l'élève"}
        </button>
      </form>
    </div>
  );
}
