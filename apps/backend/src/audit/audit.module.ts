import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Module de journalisation des actions critiques
 *
 * Fournit :
 * - AuditService : Service de création et consultation des logs d'audit
 *
 * Dépendances :
 * - PrismaModule : Accès à la base de données
 *
 * Exports :
 * - AuditService : Disponible pour injection dans les autres modules
 */
@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
