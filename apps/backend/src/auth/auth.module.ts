import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Module d'authentification
 *
 * Fonctionnalités :
 * - Inscription (création tenant + admin)
 * - Connexion (JWT)
 * - Vérification utilisateur connecté (/me)
 * - Structure pour reset password (Sprint 2+)
 *
 * Dépendances :
 * - PassportModule : gestion de l'authentification
 * - JwtModule : génération et validation des tokens
 * - PrismaModule : accès à la base de données (global)
 *
 * Configuration JWT :
 * - Secret : process.env.JWT_SECRET
 * - Expiration : 7 jours
 * - Algorithm : HS256 (par défaut)
 *
 * Sécurité :
 * ⚠️ IMPORTANT : Changer JWT_SECRET en production !
 * ⚠️ Ne jamais commit le vrai secret dans Git
 */
@Module({
  imports: [
    // Configuration Passport
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    // Configuration JWT
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      signOptions: {
        expiresIn: '7d', // Token valide 7 jours
        // Alternative : expiresIn: '1h' (plus sécurisé avec refresh tokens)
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // Stratégie pour valider les tokens
  ],
  exports: [
    AuthService, // Exporté pour utilisation dans d'autres modules si besoin
  ],
})
export class AuthModule {}
