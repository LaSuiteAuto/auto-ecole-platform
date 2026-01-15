import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../shared/enums/role.enum';

/**
 * Guard pour vérifier les rôles (RBAC - Role-Based Access Control)
 *
 * Fonctionnement :
 * 1. Récupère les rôles requis depuis les métadonnées (@Roles decorator)
 * 2. Récupère le rôle de l'utilisateur depuis req.user (défini par JwtStrategy)
 * 3. Vérifie si le rôle de l'utilisateur est dans la liste des rôles autorisés
 *
 * Utilisation :
 * ```typescript
 * @Post('students')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(Role.ADMIN, Role.SECRETARY)
 * createStudent(@Body() dto: CreateStudentDto) {
 *   // Accessible uniquement par ADMIN et SECRETARY
 * }
 * ```
 *
 * Sécurité :
 * - DOIT être utilisé APRÈS JwtAuthGuard
 * - Si @Roles n'est pas défini, la route est accessible par tous les utilisateurs authentifiés
 * - Convention Sprint 1 :
 *   - ADMIN/SECRETARY : peuvent créer élèves, séances, moniteurs
 *   - Tout le monde peut voir le planning
 *
 * @example
 * // Route accessible uniquement par les admins
 * @Roles(Role.ADMIN)
 *
 * @example
 * // Route accessible par admins et secrétaires
 * @Roles(Role.ADMIN, Role.SECRETARY)
 *
 * @example
 * // Route accessible par tous (pas de @Roles decorator)
 * // Mais toujours protégée par JwtAuthGuard
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupérer les rôles requis depuis les métadonnées
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si aucun rôle n'est requis, autoriser l'accès
    if (!requiredRoles) {
      return true;
    }

    // Récupérer l'utilisateur depuis la requête (défini par JwtStrategy)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { user } = context.switchToHttp().getRequest();

    // Vérifier si l'utilisateur a au moins un des rôles requis
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return requiredRoles.some((role) => user.role === role);
  }
}
