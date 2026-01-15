import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { JwtAuthGuard, RolesGuard } from './guards';
import { CurrentUser, Roles } from './decorators';
import { type CurrentUserData } from './decorators/current-user.decorator';
import { Role } from '../shared';

/**
 * Controller d'authentification
 *
 * Endpoints publics :
 * - POST /auth/register : Inscription nouvelle auto-école
 * - POST /auth/login : Connexion utilisateur
 *
 * Endpoints protégés (JWT requis) :
 * - GET /auth/me : Informations utilisateur connecté
 *
 * Endpoints futurs (Sprint 2+) :
 * - POST /auth/forgot-password : Demande reset password
 * - POST /auth/reset-password : Reset password avec token
 *
 * Sécurité :
 * - Validation automatique des DTOs via class-validator
 * - Mots de passe hashés (bcrypt)
 * - JWT avec expiration
 * - Pas de blacklist (logout côté client uniquement pour Sprint 1)
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   *
   * Inscription d'une nouvelle auto-école avec son administrateur
   *
   * Processus :
   * 1. Crée un tenant (auto-école)
   * 2. Crée un utilisateur ADMIN pour ce tenant
   * 3. Retourne un JWT pour connexion immédiate
   *
   * Body :
   * ```json
   * {
   *   "tenantName": "Auto École Demo",
   *   "email": "admin@demo.fr",
   *   "password": "Password123!"
   * }
   * ```
   *
   * Réponse :
   * ```json
   * {
   *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "user": {
   *     "id": "uuid",
   *     "email": "admin@demo.fr",
   *     "role": "ADMIN",
   *     "tenantId": "uuid"
   *   }
   * }
   * ```
   *
   * Erreurs :
   * - 409 Conflict : Email déjà utilisé
   * - 400 Bad Request : Validation échouée
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /auth/login
   *
   * Connexion d'un utilisateur existant
   *
   * Processus :
   * 1. Vérifie l'email et le mot de passe
   * 2. Génère un JWT
   * 3. Retourne le token et les infos utilisateur
   *
   * Body :
   * ```json
   * {
   *   "email": "admin@demo.fr",
   *   "password": "Password123!"
   * }
   * ```
   *
   * Réponse : identique à /register
   *
   * Erreurs :
   * - 401 Unauthorized : Email ou mot de passe incorrect
   * - 400 Bad Request : Validation échouée
   *
   * Sécurité :
   * - Le message d'erreur ne révèle pas si l'email existe
   * - Protection contre les attaques par force brute (à implémenter : rate limiting)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * GET /auth/me
   *
   * Récupère les informations de l'utilisateur connecté
   *
   * Headers requis :
   * ```
   * Authorization: Bearer <access_token>
   * ```
   *
   * Réponse :
   * ```json
   * {
   *   "id": "uuid",
   *   "email": "admin@demo.fr",
   *   "role": "ADMIN",
   *   "tenantId": "uuid",
   *   "createdAt": "2026-01-13T12:00:00.000Z"
   * }
   * ```
   *
   * Erreurs :
   * - 401 Unauthorized : Token manquant, invalide ou expiré
   *
   * Utilisation :
   * - Vérifier si l'utilisateur est toujours connecté
   * - Récupérer le profil après rechargement de l'app
   * - Afficher les informations utilisateur
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: CurrentUserData) {
    // L'utilisateur est déjà validé par le JwtAuthGuard
    // On récupère les données complètes depuis la DB

    return this.authService.getMe(user.userId);
  }

  /**
   * LOGOUT - Logique côté client uniquement (Sprint 1)
   *
   * Implémentation actuelle :
   * - Le frontend supprime le token du localStorage/sessionStorage
   * - Aucun endpoint backend nécessaire
   *
   * Avantages :
   * ✅ Simple et rapide à implémenter
   * ✅ Pas de gestion de blacklist
   * ✅ Stateless (principe JWT)
   *
   * Inconvénients :
   * ⚠️ Le token reste valide jusqu'à expiration
   * ⚠️ Pas de révocation immédiate
   *
   * Solution future (Sprint 2+) :
   * - Implémenter une blacklist Redis
   * - Endpoint POST /auth/logout pour invalider le token
   * - Refresh tokens avec rotation
   *
   * Pour l'instant : acceptable pour un MVP
   */

  /**
   * POST /auth/forgot-password (TODO - Sprint 2+)
   *
   * Demande de réinitialisation de mot de passe
   *
   * Fonctionnalités prévues :
   * 1. Génère un token unique
   * 2. Envoie un email avec lien de reset
   * 3. Token expire après 1h
   *
   * Dépendances :
   * - Service email (NodeMailer, SendGrid, etc.)
   * - Table PasswordResetToken
   */
  // @Post('forgot-password')
  // async forgotPassword(@Body() dto: ForgotPasswordDto) {
  //   return this.authService.requestPasswordReset(dto.email);
  // }

  /**
   * POST /auth/reset-password (TODO - Sprint 2+)
   *
   * Réinitialisation du mot de passe avec token
   *
   * Fonctionnalités prévues :
   * 1. Vérifie le token
   * 2. Hash le nouveau mot de passe
   * 3. Met à jour l'utilisateur
   * 4. Invalide le token
   */
  // @Post('reset-password')
  // async resetPassword(@Body() dto: ResetPasswordDto) {
  //   return this.authService.resetPassword(dto.token, dto.newPassword);
  // }

  /**
   * GET /auth/admin-only (EXEMPLE - Sprint 1)
   *
   * Exemple d'utilisation du RolesGuard
   *
   * Cette route est accessible uniquement par les ADMIN
   *
   * Usage du RolesGuard :
   * 1. JwtAuthGuard vérifie le token et charge l'utilisateur
   * 2. RolesGuard vérifie que user.role est dans [@Roles(...)]
   *
   * Convention Sprint 1 :
   * - ADMIN/SECRETARY : peuvent créer élèves, séances, moniteurs
   * - Tout le monde peut voir le planning (pas de @Roles sur GET /planning)
   */
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminOnly(@CurrentUser() user: CurrentUserData) {
    return {
      message: 'Route accessible uniquement par les ADMIN',
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * GET /auth/admin-or-secretary (EXEMPLE - Sprint 1)
   *
   * Exemple avec plusieurs rôles autorisés
   *
   * Route accessible par ADMIN OU SECRETARY
   * L'utilisateur doit avoir AU MOINS un des rôles listés
   */
  @Get('admin-or-secretary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SECRETARY)
  adminOrSecretary(@CurrentUser() user: CurrentUserData) {
    return {
      message: 'Route accessible par ADMIN et SECRETARY',
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    };
  }
}
