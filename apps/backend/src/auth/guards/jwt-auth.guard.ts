import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT pour protéger les routes
 *
 * Utilisation :
 * @UseGuards(JwtAuthGuard)
 *
 * Fonctionnement :
 * 1. Extrait le token du header Authorization
 * 2. Appelle JwtStrategy.validate()
 * 3. Si succès : req.user est défini et la requête continue
 * 4. Si échec : retourne 401 Unauthorized
 *
 * Le résultat de JwtStrategy.validate() est disponible dans req.user
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Méthode appelée avant la validation
   *
   * Peut être surchargée pour :
   * - Logger les tentatives d'authentification
   * - Ajouter de la logique custom
   * - Gérer des cas spéciaux
   *
   * Par défaut : délègue à Passport JWT
   */
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
