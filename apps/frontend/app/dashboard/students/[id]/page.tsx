"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

interface Student {
  id: string;
  birthName: string;
  firstName: string;
  birthDate: string;
  birthCity: string;
  birthZipCode: string | null;
  birthCountry: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  licenseType: string;
  status: string;
  neph: string | null;
  ePhotoCode: string | null;
  hasIdCard: boolean;
  hasProofOfAddress: boolean;
  hasAssr2: boolean;
  hasJdcCertificate: boolean;
  hasCensusCertificate: boolean;
  needsMedicalOpinion: boolean;
  hasMedicalOpinion: boolean;
  minutesPurchased: number;
  minutesUsed: number;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  guardianRelation: string | null;
  archivedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
}

const statusLabels: Record<string, string> = {
  PROSPECT: "Prospect",
  ANTS_PROCESSING: "En cours ANTS",
  ACTIVE: "Actif",
  EXAM_READY: "Prêt examen",
  LICENSE_OBTAINED: "Permis obtenu",
  ARCHIVED: "Archivé",
};

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get<Student>(`/students/${studentId}`);
        setStudent(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [studentId]);

  const handleArchive = async () => {
    if (!confirm("Voulez-vous vraiment archiver cet élève ?")) return;

    try {
      await api.post(`/students/${studentId}/archive`);
      router.push("/dashboard/students");
    } catch {
      alert("Erreur lors de l'archivage");
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">Chargement...</div>;
  }

  if (error || !student) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>
        <Link href="/dashboard/students" className="text-blue-600 mt-4 inline-block">
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  const remainingMinutes = student.minutesPurchased - student.minutesUsed;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  return (
    <div className="p-6 bg-white min-h-screen text-black">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/dashboard/students" className="text-blue-600 text-sm hover:underline">
            ← Retour à la liste
          </Link>
          <h1 className="text-2xl font-bold mt-2">
            {student.firstName} {student.birthName}
          </h1>
          <p className="text-gray-600">{student.user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/students/${studentId}/edit`}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Modifier
          </Link>
          {!student.archivedAt && (
            <button
              onClick={handleArchive}
              className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
            >
              Archiver
            </button>
          )}
        </div>
      </div>

      {/* Statut */}
      <div className="mb-6">
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded mr-2">
          Permis {student.licenseType}
        </span>
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded">
          {statusLabels[student.status] || student.status}
        </span>
        {student.archivedAt && (
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded ml-2">
            Archivé
          </span>
        )}
      </div>

      {/* Grille d'informations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* État Civil */}
        <div className="border rounded p-4">
          <h2 className="font-semibold text-lg mb-4 border-b pb-2">État Civil</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Date de naissance</dt>
              <dd>{new Date(student.birthDate).toLocaleDateString("fr-FR")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Lieu de naissance</dt>
              <dd>{student.birthCity} {student.birthZipCode && `(${student.birthZipCode})`}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Pays</dt>
              <dd>{student.birthCountry}</dd>
            </div>
          </dl>
        </div>

        {/* Contact */}
        <div className="border rounded p-4">
          <h2 className="font-semibold text-lg mb-4 border-b pb-2">Contact</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Téléphone</dt>
              <dd>{student.phone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Adresse</dt>
              <dd className="text-right">{student.address}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Ville</dt>
              <dd>{student.zipCode} {student.city}</dd>
            </div>
          </dl>
        </div>

        {/* Heures de conduite */}
        <div className="border rounded p-4">
          <h2 className="font-semibold text-lg mb-4 border-b pb-2">Heures de Conduite</h2>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">
              {remainingHours}h{remainingMins > 0 ? ` ${remainingMins}min` : ""}
            </div>
            <p className="text-gray-600 mt-2">restantes</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Achetées: {Math.round(student.minutesPurchased / 60)}h</p>
              <p>Utilisées: {Math.round(student.minutesUsed / 60)}h</p>
            </div>
          </div>
        </div>

        {/* Documents ANTS */}
        <div className="border rounded p-4">
          <h2 className="font-semibold text-lg mb-4 border-b pb-2">Documents ANTS</h2>
          {student.neph && (
            <p className="mb-2">
              <span className="text-gray-600">NEPH:</span> {student.neph}
            </p>
          )}
          {student.ePhotoCode && (
            <p className="mb-4">
              <span className="text-gray-600">Code e-photo:</span> {student.ePhotoCode}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className={student.hasIdCard ? "text-green-600" : "text-gray-400"}>
              {student.hasIdCard ? "✓" : "○"} Carte d&apos;identité
            </div>
            <div className={student.hasProofOfAddress ? "text-green-600" : "text-gray-400"}>
              {student.hasProofOfAddress ? "✓" : "○"} Justificatif domicile
            </div>
            <div className={student.hasAssr2 ? "text-green-600" : "text-gray-400"}>
              {student.hasAssr2 ? "✓" : "○"} ASSR2
            </div>
            <div className={student.hasJdcCertificate ? "text-green-600" : "text-gray-400"}>
              {student.hasJdcCertificate ? "✓" : "○"} Certificat JDC
            </div>
            <div className={student.hasCensusCertificate ? "text-green-600" : "text-gray-400"}>
              {student.hasCensusCertificate ? "✓" : "○"} Attestation recensement
            </div>
            {student.needsMedicalOpinion && (
              <div className={student.hasMedicalOpinion ? "text-green-600" : "text-orange-500"}>
                {student.hasMedicalOpinion ? "✓" : "○"} Avis médical
              </div>
            )}
          </div>
        </div>

        {/* Représentant légal (si mineur) */}
        {student.guardianName && (
          <div className="border rounded p-4">
            <h2 className="font-semibold text-lg mb-4 border-b pb-2">Représentant Légal</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Nom</dt>
                <dd>{student.guardianName}</dd>
              </div>
              {student.guardianRelation && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Relation</dt>
                  <dd>{student.guardianRelation}</dd>
                </div>
              )}
              {student.guardianPhone && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Téléphone</dt>
                  <dd>{student.guardianPhone}</dd>
                </div>
              )}
              {student.guardianEmail && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Email</dt>
                  <dd>{student.guardianEmail}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* Métadonnées */}
      <div className="mt-6 text-sm text-gray-500">
        <p>Créé le {new Date(student.createdAt).toLocaleDateString("fr-FR")}</p>
        {student.archivedAt && (
          <p>Archivé le {new Date(student.archivedAt).toLocaleDateString("fr-FR")}</p>
        )}
      </div>
    </div>
  );
}
