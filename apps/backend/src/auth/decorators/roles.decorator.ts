import { SetMetadata } from '@nestjs/common';
import { Role } from '../../shared/enums/role.enum';

/**
 * Clé de métadonnée pour stocker les rôles requis
 */
export const ROLES_KEY = 'roles';

/**
 * Décorateur pour spécifier les rôles autorisés sur une route
 *
 * Utilisation :
 * ```typescript
 * @Get('users')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(Role.ADMIN, Role.SECRETARY)
 * getAllUsers() {
 *   // Accessible uniquement par ADMIN et SECRETARY
 * }
 * ```
 *
 * Sécurité :
 * - Doit être utilisé avec JwtAuthGuard ET RolesGuard
 * - L'ordre des guards est important : JwtAuthGuard en premier
 * - Si plusieurs rôles, l'utilisateur doit avoir AU MOINS un des rôles
 *
 * @param roles - Liste des rôles autorisés
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
