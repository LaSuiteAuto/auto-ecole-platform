"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";

// Types
interface Student {
  id: string;
  birthName: string;
  firstName: string;
  phone: string;
  licenseType: string;
  status: string;
  archivedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
}

// Status labels en français
const statusLabels: Record<string, string> = {
  PROSPECT: "Prospect",
  ANTS_PROCESSING: "En cours ANTS",
  ACTIVE: "Actif",
  EXAM_READY: "Prêt examen",
  LICENSE_OBTAINED: "Permis obtenu",
  ARCHIVED: "Archivé",
};

// Status colors
const statusColors: Record<string, string> = {
  PROSPECT: "bg-gray-100 text-gray-800",
  ANTS_PROCESSING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  EXAM_READY: "bg-blue-100 text-blue-800",
  LICENSE_OBTAINED: "bg-purple-100 text-purple-800",
  ARCHIVED: "bg-red-100 text-red-800",
};

export default function StudentsListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Charger les élèves
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `/students${showArchived ? "?includeArchived=true" : ""}`;
      const res = await api.get<Student[]>(url);
      setStudents(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Archiver un élève
  const handleArchive = async (id: string) => {
    if (!confirm("Voulez-vous vraiment archiver cet élève ?")) return;

    try {
      await api.post(`/students/${id}/archive`);
      fetchStudents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  // Restaurer un élève
  const handleRestore = async (id: string) => {
    try {
      await api.post(`/students/${id}/restore`);
      fetchStudents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Liste des Élèves</h1>
        <Link
          href="/dashboard/students/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Nouvel Élève
        </Link>
      </div>

      {/* Filtres */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-black">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-4 h-4"
          />
          Afficher les élèves archivés
        </label>
      </div>

      {/* États */}
      {isLoading && (
        <div className="text-center py-10 text-gray-600">Chargement...</div>
      )}

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>
      )}

      {/* Liste vide */}
      {!isLoading && !error && students.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          Aucun élève trouvé.{" "}
          <Link href="/dashboard/students/new" className="text-blue-600 hover:underline">
            Créer le premier élève
          </Link>
        </div>
      )}

      {/* Tableau des élèves */}
      {!isLoading && !error && students.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3 font-semibold text-black">Nom</th>
                <th className="text-left p-3 font-semibold text-black">Email</th>
                <th className="text-left p-3 font-semibold text-black">Téléphone</th>
                <th className="text-left p-3 font-semibold text-black">Permis</th>
                <th className="text-left p-3 font-semibold text-black">Statut</th>
                <th className="text-left p-3 font-semibold text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr
                  key={student.id}
                  className={`border-b hover:bg-gray-50 ${
                    student.archivedAt ? "opacity-60" : ""
                  }`}
                >
                  <td className="p-3 text-black">
                    <span className="font-medium">
                      {student.firstName} {student.birthName}
                    </span>
                  </td>
                  <td className="p-3 text-gray-700">{student.user.email}</td>
                  <td className="p-3 text-gray-700">{student.phone}</td>
                  <td className="p-3">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {student.licenseType}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        statusColors[student.status] || "bg-gray-100"
                      }`}
                    >
                      {statusLabels[student.status] || student.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {/* Voir détails */}
                      <Link
                        href={`/dashboard/students/${student.id}`}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                      >
                        Voir
                      </Link>

                      {/* Modifier */}
                      <Link
                        href={`/dashboard/students/${student.id}/edit`}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                      >
                        Modifier
                      </Link>

                      {/* Archiver / Restaurer */}
                      {student.archivedAt ? (
                        <button
                          onClick={() => handleRestore(student.id)}
                          className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200"
                        >
                          Restaurer
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchive(student.id)}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                        >
                          Archiver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Résumé */}
      {!isLoading && !error && students.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          {students.length} élève{students.length > 1 ? "s" : ""} trouvé
          {students.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
