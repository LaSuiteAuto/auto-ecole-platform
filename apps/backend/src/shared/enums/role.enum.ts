/**
 * Enum des rôles utilisateurs
 *
 * Doit correspondre à l'enum UserRole dans Prisma schema
 *
 * Hiérarchie des permissions (Sprint 1) :
 * - ADMIN : Accès complet (créer élèves, séances, moniteurs)
 * - SECRETARY : Gestion administrative (créer élèves, séances, moniteurs)
 * - INSTRUCTOR : Consultation + gestion des séances assignées
 * - STUDENT : Consultation du planning et ses propres séances
 *
 * Convention :
 * - Admin/Secrétaire : peuvent créer élèves, séances, moniteurs
 * - Tout le monde peut voir le planning
 */
export enum Role {
  ADMIN = 'ADMIN',
  SECRETARY = 'SECRETARY',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
}
