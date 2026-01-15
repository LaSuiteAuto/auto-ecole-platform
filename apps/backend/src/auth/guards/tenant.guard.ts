import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * Guard pour vérifier la présence du tenantId
 *
 * Sécurité Multi-Tenant :
 * - OBLIGATOIRE sur toutes les routes protégées
 * - Vérifie que req.user.tenantId existe
 * - Bloque toute requête sans tenant
 *
 * Utilisation :
 * ```typescript
 * @Get('students')
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * async getStudents(@CurrentUser() user: CurrentUserData) {
 *   // user.tenantId est garanti d'exister
 *   return this.service.findAll({ tenantId: user.tenantId });
 * }
 * ```
 *
 * Ordre des Guards :
 * 1. JwtAuthGuard (charge req.user)
 * 2. TenantGuard (vérifie tenantId)
 * 3. RolesGuard (vérifie rôle) - optionnel
 *
 * Sécurité :
 * - DOIT être utilisé APRÈS JwtAuthGuard
 * - Empêche les fuites de données entre tenants
 * - Garantit l'isolation des données
 *
 * Convention :
 * - Toutes les requêtes DB DOIVENT filtrer par tenantId
 * - Jamais de requête sans where: { tenantId }
 * - Voir docs/team-rules.md pour les règles complètes
 *
 * @example
 * // Route avec TenantGuard
 * @Get('students')
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * getStudents(@CurrentUser() user: CurrentUserData) {
 *   return this.prisma.student.findMany({
 *     where: { tenantId: user.tenantId }
 *   });
 * }
 *
 * @example
 * // Avec RolesGuard aussi
 * @Post('students')
 * @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
 * @Roles(Role.ADMIN, Role.SECRETARY)
 * createStudent(@CurrentUser() user: CurrentUserData) {
 *   return this.service.create(dto, user.tenantId);
 * }
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Récupérer la requête HTTP
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();

    // Récupérer l'utilisateur (défini par JwtAuthGuard)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user = request.user;

    // Vérifier que l'utilisateur existe ET a un tenantId
    // !! convertit en boolean
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return !!(user && user.tenantId);
  }
}
