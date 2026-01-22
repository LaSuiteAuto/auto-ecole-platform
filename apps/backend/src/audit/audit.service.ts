import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Interface pour les données d'un log d'audit
 */
export interface AuditLogData {
  tenantId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}

/**
 * Service de journalisation des actions critiques métier
 *
 * Actions critiques loggées :
 * - Annulation/modification de séance
 * - Changement des heures restantes d'un élève
 * - Création/suppression de moniteur
 * - Changement de rôle (escalade de privilèges)
 * - Archivage d'élève
 * - Export de données
 *
 * Principe :
 * - Logs stockés en base de données (table AuditLog)
 * - Filtrage par tenantId (multi-tenant)
 * - Traçabilité complète : qui, quoi, quand, sur quelle entité
 *
 * Utilisation :
 * ```typescript
 * await this.auditService.log({
 *   tenantId: user.tenantId,
 *   actorUserId: user.userId,
 *   action: 'LESSON_CANCELLED',
 *   entityType: 'Lesson',
 *   entityId: lessonId,
 *   metadata: { reason: 'Student sick', cancelledBy: 'ADMIN' }
 * });
 * ```
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Enregistre une action critique dans l'audit log
   *
   * @param data - Données de l'action à logger
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          actorUserId: data.actorUserId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: data.metadata || {},
        },
      });

      // Log technique supplémentaire pour stdout
      this.logger.log(
        JSON.stringify({
          type: 'audit',
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          tenantId: data.tenantId,
          actorUserId: data.actorUserId,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (error) {
      // Si le log échoue, on ne doit pas bloquer l'action métier
      // Mais on log l'erreur en stdout
      this.logger.error(
        `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
        },
      );
    }
  }

  /**
   * Récupère les logs d'audit pour un tenant
   *
   * @param tenantId - ID du tenant
   * @param limit - Nombre maximum de logs à récupérer
   */

  async getLogs(tenantId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Récupère les logs d'audit pour une entité spécifique
   *
   * @param tenantId - ID du tenant
   * @param entityType - Type d'entité (Student, Lesson, etc.)
   * @param entityId - ID de l'entité
   */

  async getLogsForEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Récupère les logs d'audit d'un utilisateur spécifique
   *
   * @param tenantId - ID du tenant
   * @param userId - ID de l'utilisateur
   */

  async getLogsForUser(tenantId: string, userId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        actorUserId: userId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
