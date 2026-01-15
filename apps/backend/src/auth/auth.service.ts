import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import * as bcrypt from 'bcrypt';

/**
 * Service d'authentification
 *
 * Responsabilités :
 * - Inscription (création tenant + admin)
 * - Connexion (vérification credentials + génération JWT)
 * - Validation utilisateur
 * - Hashage sécurisé des mots de passe
 *
 * Sécurité :
 * - Mots de passe hashés avec bcrypt (salt rounds: 10)
 * - JWT avec expiration configurable
 * - Validation stricte des entrées via DTOs
 */
@Injectable()
export class AuthService {
  /**
   * Nombre de rounds pour le salt bcrypt
   * Plus le nombre est élevé, plus le hashage est sécurisé mais lent
   * 10 est un bon compromis pour 2026
   */
  private readonly BCRYPT_SALT_ROUNDS = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Inscription d'une nouvelle auto-école avec son administrateur
   *
   * Processus :
   * 1. Vérifie que l'email n'existe pas déjà
   * 2. Crée le tenant (auto-école)
   * 3. Hash le mot de passe
   * 4. Crée l'utilisateur admin
   * 5. Génère et retourne un JWT
   *
   * @param registerDto - Données d'inscription (tenant + admin)
   * @returns Token JWT et informations utilisateur
   * @throws ConflictException si l'email existe déjà
   */
  async register(registerDto: RegisterDto) {
    const { tenantName, email, password } = registerDto;

    // Vérification : l'email doit être unique dans toute la base

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Hash du mot de passe avec bcrypt
    // Le salt est généré automatiquement par bcrypt
    const hashedPassword = await bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);

    // Transaction : création tenant + user en une seule opération atomique
    // Si une étape échoue, tout est annulé

    const tenant = await this.prisma.tenant.create({
      data: {
        name: tenantName,
        users: {
          create: {
            email,
            password: hashedPassword,
            role: 'ADMIN', // Premier utilisateur = toujours admin
          },
        },
      },
      include: {
        users: true, // Inclut l'utilisateur créé dans la réponse
      },
    });

    const user = tenant.users[0];

    // Génération du JWT

    const token = this.generateToken(user.id, user.tenantId, user.role);

    return {
      access_token: token,
      user: {
        id: user.id,

        email: user.email,

        role: user.role,

        tenantId: user.tenantId,
      },
    };
  }

  /**
   * Connexion d'un utilisateur existant
   *
   * Processus :
   * 1. Recherche l'utilisateur par email
   * 2. Vérifie le mot de passe avec bcrypt
   * 3. Génère et retourne un JWT
   *
   * @param loginDto - Identifiants de connexion
   * @returns Token JWT et informations utilisateur
   * @throws UnauthorizedException si email ou mot de passe incorrect
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Recherche de l'utilisateur par email

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Message générique pour ne pas révéler si l'email existe
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérification du mot de passe avec bcrypt
    // bcrypt.compare gère automatiquement le salt

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Génération du JWT

    const token = this.generateToken(user.id, user.tenantId, user.role);

    return {
      access_token: token,
      user: {
        id: user.id,

        email: user.email,

        role: user.role,

        tenantId: user.tenantId,
      },
    };
  }

  /**
   * Récupère les informations de l'utilisateur connecté
   *
   * Utilisé par le endpoint /auth/me
   * L'userId est extrait du JWT par le JwtGuard
   *
   * @param userId - ID de l'utilisateur (depuis le JWT)
   * @returns Informations complètes de l'utilisateur
   * @throws UnauthorizedException si l'utilisateur n'existe pas
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
        // On ne retourne JAMAIS le password, même hashé
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    return user;
  }

  /**
   * Valide un utilisateur à partir de son ID
   *
   * Utilisé par la stratégie JWT pour vérifier que l'utilisateur existe toujours
   *
   * @param userId - ID de l'utilisateur
   * @returns Utilisateur si valide, null sinon
   */

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
      },
    });
  }

  /**
   * Génère un JWT pour un utilisateur
   *
   * Payload du token :
   * - sub: user ID (standard JWT)
   * - tenantId: pour le multi-tenant
   * - role: pour les autorisations
   *
   * @param userId - ID de l'utilisateur
   * @param tenantId - ID du tenant
   * @param role - Rôle de l'utilisateur
   * @returns Token JWT signé
   */
  private generateToken(
    userId: string,
    tenantId: string,
    role: string,
  ): string {
    const payload = {
      sub: userId, // "sub" = subject (standard JWT)
      tenantId,
      role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Reset password - Structure pour Sprint 2+
   *
   * TODO: Implémenter dans un sprint futur
   * Fonctionnalités prévues :
   * 1. Demande de reset (génère token unique)
   * 2. Envoi email avec lien
   * 3. Validation du token
   * 4. Modification du mot de passe
   *
   * Dépendances futures :
   * - Service d'email (NodeMailer, SendGrid, etc.)
   * - Table pour stocker les tokens de reset
   * - Expiration des tokens (ex: 1h)
   */
  requestPasswordReset(_email: string) {
    throw new BadRequestException(
      'La fonctionnalité de reset password sera disponible prochainement',
    );
  }

  resetPassword(_token: string, _newPassword: string) {
    throw new BadRequestException(
      'La fonctionnalité de reset password sera disponible prochainement',
    );
  }
}
