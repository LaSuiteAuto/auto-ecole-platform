import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

/**
 * Payload du JWT décodé
 *
 * Structure standardisée du token :
 * - sub: Subject (ID utilisateur)
 * - tenantId: ID de l'auto-école (multi-tenant)
 * - role: Rôle utilisateur (ADMIN, INSTRUCTOR, STUDENT, SECRETARY)
 * - iat: Issued At (date de création du token)
 * - exp: Expiration (date d'expiration du token)
 */
export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Stratégie JWT pour Passport
 *
 * Responsabilités :
 * 1. Extraire le token du header Authorization
 * 2. Vérifier la signature du token
 * 3. Valider que l'utilisateur existe toujours
 * 4. Injecter les infos utilisateur dans req.user
 *
 * Sécurité :
 * - Token extrait du header Bearer
 * - Signature vérifiée avec JWT_SECRET
 * - Double validation : token + existence user en DB
 * - Rejette les tokens expirés automatiquement
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      // Extraction du token depuis le header "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Rejette automatiquement les tokens expirés
      ignoreExpiration: false,

      // Secret pour vérifier la signature du token
      // IMPORTANT: Doit être le même que lors de la génération du token
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    });
  }

  /**
   * Méthode appelée après validation du token
   *
   * Processus :
   * 1. Passport décode et vérifie le token automatiquement
   * 2. Si valide, cette méthode est appelée avec le payload
   * 3. On vérifie que l'utilisateur existe toujours en DB
   * 4. Le résultat est injecté dans req.user
   *
   * @param payload - Payload décodé du JWT
   * @returns Informations utilisateur pour req.user
   * @throws UnauthorizedException si l'utilisateur n'existe plus
   */
  async validate(payload: JwtPayload) {
    // Vérification supplémentaire : l'utilisateur existe-t-il toujours ?
    // Protège contre les tokens valides d'utilisateurs supprimés

    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Utilisateur invalide ou supprimé');
    }

    // Retourne les infos qui seront disponibles dans req.user
    // On enrichit avec les données fraîches de la DB
    return {
      userId: user.id,

      email: user.email,

      tenantId: user.tenantId,

      role: user.role,
    };
  }
}
