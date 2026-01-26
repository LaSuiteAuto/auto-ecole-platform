import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { RequestLoggingInterceptor } from './shared/interceptors';
import { StudentsModule } from './student/student.module';

/**
 * Module principal de l'application
 *
 * Modules importés :
 * - PrismaModule : accès base de données (Global)
 * - AuthModule : authentification et autorisation
 * - AuditModule : journalisation des actions critiques
 *
 * Interceptors globaux :
 * - RequestLoggingInterceptor : logging technique de toutes les requêtes HTTP
 *
 * Architecture :
 * - Multi-tenant (isolation par tenantId)
 * - JWT pour l'authentification
 * - Role-based access control (RBAC)
 * - Audit logging (technique + métier)
 */
@Module({
  imports: [
    PrismaModule, // Base de données
    AuthModule, // Authentification
    AuditModule, // Audit logging
    StudentsModule, // Gestion des élèves
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}
