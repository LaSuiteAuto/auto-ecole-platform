import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './student.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { StudentStatus, UserRole, LicenseType } from '@prisma/client';

describe('StudentsService', () => {
  let service: StudentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    student: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockStudentId = 'student-789';
  const mockActorUserId = 'actor-999';

  const mockCreateStudentDto = {
    email: 'eleve@test.fr',
    password: 'Password123!',
    birthName: 'DUPONT',
    firstName: 'Marie',
    birthDate: '2000-05-15',
    birthCity: 'Paris',
    birthCountry: 'FRANCE',
    address: '12 rue de la République',
    city: 'Lyon',
    zipCode: '69001',
    phone: '+33612345678',
  };

  const mockStudent = {
    id: mockStudentId,
    userId: mockUserId,
    tenantId: mockTenantId,
    birthName: 'DUPONT',
    firstName: 'Marie',
    birthDate: new Date('2000-05-15'),
    birthCity: 'Paris',
    birthCountry: 'FRANCE',
    address: '12 rue de la République',
    city: 'Lyon',
    zipCode: '69001',
    phone: '+33612345678',
    status: StudentStatus.PROSPECT,
    licenseType: LicenseType.B,
    minutesPurchased: 1200,
    minutesUsed: 300,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: mockUserId,
      email: 'eleve@test.fr',
      role: UserRole.STUDENT,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ==================== CREATE ====================
  describe('create', () => {
    it('devrait créer un élève avec succès', async () => {
      mockPrismaService.$transaction.mockImplementation((callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: mockUserId,
              email: mockCreateStudentDto.email,
              role: UserRole.STUDENT,
              tenantId: mockTenantId,
            }),
          },
          student: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockStudent),
          },
        };
        return callback(tx);
      });

      const result = await service.create(mockCreateStudentDto, mockTenantId);

      expect(result).toEqual(mockStudent);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('devrait rejeter si email déjà utilisé', async () => {
      mockPrismaService.$transaction.mockImplementation((callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'existing-user',
              email: mockCreateStudentDto.email,
            }),
          },
          student: {
            findUnique: jest.fn(),
          },
        };
        return callback(tx);
      });

      await expect(
        service.create(mockCreateStudentDto, mockTenantId),
      ).rejects.toThrow(ConflictException);
    });

    it('devrait rejeter si NEPH déjà utilisé', async () => {
      const dtoWithNeph = { ...mockCreateStudentDto, neph: '123456789012' };

      mockPrismaService.$transaction.mockImplementation((callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          student: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'existing-student',
              neph: '123456789012',
            }),
          },
        };
        return callback(tx);
      });

      await expect(service.create(dtoWithNeph, mockTenantId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ==================== FIND ALL ====================
  describe('findAll', () => {
    it('devrait retourner tous les élèves non archivés', async () => {
      mockPrismaService.student.findMany.mockResolvedValue([mockStudent]);

      const result = await service.findAll(mockTenantId);

      expect(result).toEqual([mockStudent]);
      expect(mockPrismaService.student.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          archivedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('devrait inclure les élèves archivés si demandé', async () => {
      const archivedStudent = { ...mockStudent, archivedAt: new Date() };
      mockPrismaService.student.findMany.mockResolvedValue([
        mockStudent,
        archivedStudent,
      ]);

      const result = await service.findAll(mockTenantId, true);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.student.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });
  });

  // ==================== FIND ONE ====================
  describe('findOne', () => {
    it('devrait retourner un élève par ID', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);

      const result = await service.findOne(mockStudentId, mockTenantId);

      expect(result).toEqual(mockStudent);
    });

    it('devrait rejeter si élève non trouvé', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait rejeter si élève appartient à un autre tenant', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue({
        ...mockStudent,
        tenantId: 'other-tenant',
      });

      await expect(
        service.findOne(mockStudentId, mockTenantId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==================== UPDATE ====================
  describe('update', () => {
    it('devrait mettre à jour un élève', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);
      mockPrismaService.student.update.mockResolvedValue({
        ...mockStudent,
        firstName: 'Julie',
      });

      const result = await service.update(
        mockStudentId,
        { firstName: 'Julie' },
        mockTenantId,
      );

      expect(result.firstName).toBe('Julie');
    });

    it('devrait mettre à jour email dans User et Student', async () => {
      mockPrismaService.student.findUnique
        .mockResolvedValueOnce(mockStudent) // findOne
        .mockResolvedValueOnce({ ...mockStudent, user: { id: mockUserId } }); // update check
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.student.update.mockResolvedValue({
        ...mockStudent,
        user: { ...mockStudent.user, email: 'nouveau@test.fr' },
      });

      const result = await service.update(
        mockStudentId,
        { email: 'nouveau@test.fr' },
        mockTenantId,
      );

      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('devrait rejeter si nouvel email déjà pris', async () => {
      mockPrismaService.student.findUnique
        .mockResolvedValueOnce(mockStudent)
        .mockResolvedValueOnce({ ...mockStudent, user: { id: mockUserId } });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'other-user-id',
        email: 'autre@test.fr',
      });

      await expect(
        service.update(mockStudentId, { email: 'autre@test.fr' }, mockTenantId),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ==================== ARCHIVE ====================
  describe('archive', () => {
    it('devrait archiver un élève', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);
      mockPrismaService.student.update.mockResolvedValue({
        ...mockStudent,
        archivedAt: new Date(),
        status: StudentStatus.ARCHIVED,
      });

      const result = await service.archive(
        mockStudentId,
        mockTenantId,
        mockActorUserId,
      );

      expect(result.archivedAt).toBeDefined();
      expect(result.status).toBe(StudentStatus.ARCHIVED);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STUDENT_ARCHIVED',
          entityType: 'Student',
          entityId: mockStudentId,
        }),
      );
    });
  });

  // ==================== RESTORE ====================
  describe('restore', () => {
    it('devrait restaurer un élève archivé', async () => {
      const archivedStudent = {
        ...mockStudent,
        archivedAt: new Date(),
        status: StudentStatus.ARCHIVED,
      };
      mockPrismaService.student.findUnique.mockResolvedValue(archivedStudent);
      mockPrismaService.student.update.mockResolvedValue({
        ...mockStudent,
        archivedAt: null,
        status: StudentStatus.ACTIVE,
      });

      const result = await service.restore(
        mockStudentId,
        mockTenantId,
        mockActorUserId,
      );

      expect(result.archivedAt).toBeNull();
      expect(result.status).toBe(StudentStatus.ACTIVE);
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('devrait rejeter si élève non archivé', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent); // archivedAt: null

      await expect(
        service.restore(mockStudentId, mockTenantId, mockActorUserId),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ==================== REMOVE ====================
  describe('remove', () => {
    it('devrait supprimer définitivement un élève et son user', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);
      mockPrismaService.$transaction.mockImplementation((callback) => {
        const tx = {
          student: { delete: jest.fn().mockResolvedValue(mockStudent) },
          user: { delete: jest.fn().mockResolvedValue({}) },
        };
        return callback(tx);
      });

      await service.remove(mockStudentId, mockTenantId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  // ==================== HEURES ====================
  describe('getRemainingMinutes', () => {
    it('devrait calculer les minutes restantes', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);

      const result = await service.getRemainingMinutes(
        mockStudentId,
        mockTenantId,
      );

      expect(result).toBe(900); // 1200 - 300
    });
  });

  describe('addPurchasedMinutes', () => {
    it('devrait ajouter des minutes achetées', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);
      mockPrismaService.student.update.mockResolvedValue({
        ...mockStudent,
        minutesPurchased: 1800, // 1200 + 600
      });

      const result = await service.addPurchasedMinutes(
        mockStudentId,
        600,
        mockTenantId,
        mockActorUserId,
      );

      expect(result.minutesPurchased).toBe(1800);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STUDENT_HOURS_UPDATED',
          entityType: 'Student',
          metadata: expect.objectContaining({ type: 'PURCHASE' }),
        }),
      );
    });
  });

  describe('addUsedMinutes', () => {
    it('devrait ajouter des minutes consommées', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);
      mockPrismaService.student.update.mockResolvedValue({
        ...mockStudent,
        minutesUsed: 360, // 300 + 60
      });

      const result = await service.addUsedMinutes(
        mockStudentId,
        60,
        mockTenantId,
        mockActorUserId,
      );

      expect(result.minutesUsed).toBe(360);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STUDENT_HOURS_UPDATED',
          entityType: 'Student',
          metadata: expect.objectContaining({ type: 'CONSUMPTION' }),
        }),
      );
    });

    it('devrait rejeter si heures insuffisantes', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);

      // Essayer de consommer plus que disponible (900 restantes)
      await expect(
        service.addUsedMinutes(
          mockStudentId,
          1000,
          mockTenantId,
          mockActorUserId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
