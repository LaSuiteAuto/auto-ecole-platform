'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const isAdminOrSecretary = user.role === 'ADMIN' || user.role === 'SECRETARY';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenue, {user.email}
        </h1>
        <p className="mt-2 text-gray-600">
          Vous êtes connecté en tant que{' '}
          <span className="font-medium">
            {user.role === 'ADMIN'
              ? 'Administrateur'
              : user.role === 'SECRETARY'
              ? 'Secrétaire'
              : user.role === 'INSTRUCTOR'
              ? 'Moniteur'
              : 'Élève'}
          </span>
        </p>
      </div>

      {isAdminOrSecretary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Gestion des élèves */}
          <Link
            href="/dashboard/students"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Dossiers élèves
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Gérer les élèves, heures, et statuts
                </p>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Planning */}
          <div className="block p-6 bg-white rounded-lg shadow opacity-50 cursor-not-allowed">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Planning
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Gérer les créneaux et réservations
                </p>
                <span className="mt-2 inline-block text-xs text-gray-500">
                  À venir
                </span>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Facturation */}
          <div className="block p-6 bg-white rounded-lg shadow opacity-50 cursor-not-allowed">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Facturation
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Gérer les paiements et factures
                </p>
                <span className="mt-2 inline-block text-xs text-gray-500">
                  À venir
                </span>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {user.role === 'INSTRUCTOR' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900">
            Espace Moniteur
          </h3>
          <p className="mt-2 text-blue-800">
            Votre interface moniteur sera disponible prochainement.
          </p>
        </div>
      )}

      {user.role === 'STUDENT' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900">
            Espace Élève
          </h3>
          <p className="mt-2 text-green-800">
            Votre interface élève sera disponible prochainement.
          </p>
        </div>
      )}
    </div>
  );
}
