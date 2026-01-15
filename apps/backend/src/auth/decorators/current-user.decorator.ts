import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Interface de l'utilisateur connecté
 * Disponible via @CurrentUser() dans les controllers
 */
export interface CurrentUserData {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}

/**
 * Décorateur personnalisé pour extraire l'utilisateur connecté
 *
 * Utilisation :
 * ```typescript
 * @Get('me')
 * @UseGuards(JwtAuthGuard)
 * getMe(@CurrentUser() user: CurrentUserData) {
 *   return user;
 * }
 * ```
 *
 * Ou pour récupérer une propriété spécifique :
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser('userId') userId: string) {
 *   return this.service.getProfile(userId);
 * }
 * ```
 *
 * Sécurité :
 * - Doit être utilisé avec @UseGuards(JwtAuthGuard)
 * - Les données viennent de JwtStrategy.validate()
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user = request.user;

    // Si une propriété spécifique est demandée, on la retourne
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return data ? user?.[data] : user;
  },
);
