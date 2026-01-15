import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

/**
 * Module principal de l'application
 *
 * Modules importés :
 * - PrismaModule : accès base de données (Global)
 * - AuthModule : authentification et autorisation
 *
 * Architecture :
 * - Multi-tenant (isolation par tenantId)
 * - JWT pour l'authentification
 * - Role-based access control (RBAC)
 */
@Module({
  imports: [
    PrismaModule, // Base de données
    AuthModule, // Authentification
  ],
})
export class AppModule {}
