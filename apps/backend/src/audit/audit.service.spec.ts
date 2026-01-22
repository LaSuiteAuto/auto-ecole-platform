import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from './enums/audit-action.enum';

/**
 * Tests unitaires pour AuditService
 *
 * Couvre :
 * - Création de logs d'audit
 * - Récupération de logs par tenant
 * - Récupération de logs par entité
 * - Récupération de logs par utilisateur
 * - Gestion des erreurs
 */
describe('AuditService', () => {
  let service: AuditService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it("devrait créer un log d'audit avec succès", async () => {
      const logData = {
        tenantId: 'tenant-123',
        actorUserId: 'user-456',
        action: AuditAction.LESSON_CANCELLED,
        entityType: 'Lesson',
        entityId: 'lesson-789',
        metadata: { reason: 'Student sick' },
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'audit-1',
        ...logData,
        createdAt: new Date(),
      });

      await service.log(logData);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: logData.tenantId,
          actorUserId: logData.actorUserId,
          action: logData.action,
          entityType: logData.entityType,
          entityId: logData.entityId,
          metadata: logData.metadata,
        },
      });
    });

    it('devrait créer un log sans metadata si non fourni', async () => {
      const logData = {
        tenantId: 'tenant-123',
        actorUserId: 'user-456',
        action: AuditAction.STUDENT_ARCHIVED,
        entityType: 'Student',
        entityId: 'student-789',
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'audit-1',
        ...logData,
        metadata: {},
        createdAt: new Date(),
      });

      await service.log(logData);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: logData.tenantId,
          actorUserId: logData.actorUserId,
          action: logData.action,
          entityType: logData.entityType,
          entityId: logData.entityId,
          metadata: {},
        },
      });
    });

    it("ne devrait pas throw d'erreur si la création échoue", async () => {
      const logData = {
        tenantId: 'tenant-123',
        actorUserId: 'user-456',
        action: AuditAction.LESSON_CANCELLED,
        entityType: 'Lesson',
        entityId: 'lesson-789',
      };

      mockPrismaService.auditLog.create.mockRejectedValue(
        new Error('Database error'),
      );

      // Ne devrait pas throw
      await expect(service.log(logData)).resolves.not.toThrow();
    });
  });

  describe('getLogs', () => {
    it("devrait récupérer les logs d'un tenant avec limite par défaut", async () => {
      const tenantId = 'tenant-123';
      const mockLogs = [
        {
          id: 'audit-1',
          tenantId,
          action: AuditAction.LESSON_CANCELLED,
          entityType: 'Lesson',
          entityId: 'lesson-1',
          actor: { id: 'user-1', email: 'admin@test.fr', role: 'ADMIN' },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getLogs(tenantId);

      expect(result).toEqual(mockLogs);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
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
        take: 100,
      });
    });

    it('devrait récupérer les logs avec une limite personnalisée', async () => {
      const tenantId = 'tenant-123';
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getLogs(tenantId, 50);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });
  });

  describe('getLogsForEntity', () => {
    it('devrait récupérer les logs pour une entité spécifique', async () => {
      const tenantId = 'tenant-123';
      const entityType = 'Lesson';
      const entityId = 'lesson-789';

      const mockLogs = [
        {
          id: 'audit-1',
          tenantId,
          action: AuditAction.LESSON_CANCELLED,
          entityType,
          entityId,
          actor: { id: 'user-1', email: 'admin@test.fr', role: 'ADMIN' },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getLogsForEntity(
        tenantId,
        entityType,
        entityId,
      );

      expect(result).toEqual(mockLogs);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
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
    });
  });

  describe('getLogsForUser', () => {
    it("devrait récupérer les logs d'un utilisateur spécifique", async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-456';

      const mockLogs = [
        {
          id: 'audit-1',
          tenantId,
          actorUserId: userId,
          action: AuditAction.STUDENT_ARCHIVED,
          entityType: 'Student',
          entityId: 'student-1',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getLogsForUser(tenantId, userId);

      expect(result).toEqual(mockLogs);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          actorUserId: userId,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('Isolation multi-tenant', () => {
    it('ne devrait retourner que les logs du tenant demandé', async () => {
      const tenantId = 'tenant-123';
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getLogs(tenantId);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
        }),
      );
    });
  });
});
