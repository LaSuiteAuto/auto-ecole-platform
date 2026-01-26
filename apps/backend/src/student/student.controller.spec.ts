import { Test, TestingModule } from '@nestjs/testing';
import { StudentsController } from './student.controller';
import { StudentsService } from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StudentStatus, LicenseType, UserRole } from '@prisma/client';
import { Role } from '../shared/enums/role.enum';

describe('StudentsController', () => {
  let controller: StudentsController;
  let service: StudentsService;

  const mockStudentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    remove: jest.fn(),
    getRemainingMinutes: jest.fn(),
    addPurchasedMinutes: jest.fn(),
    addUsedMinutes: jest.fn(),
  };

  const mockTenantId = 'tenant-123';
  const mockStudentId = 'student-789';

  const mockRequest = {
    user: {
      sub: 'user-456',
      email: 'admin@test.fr',
      role: Role.ADMIN,
      tenantId: mockTenantId,
    },
  };

  const mockStudent = {
    id: mockStudentId,
    userId: 'user-student',
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
    user: {
      id: 'user-student',
      email: 'eleve@test.fr',
      role: UserRole.STUDENT,
    },
  };

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [
        {
          provide: StudentsService,
          useValue: mockStudentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StudentsController>(StudentsController);
    service = module.get<StudentsService>(StudentsService);

    jest.clearAllMocks();
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  // ==================== CREATE ====================
  describe('create', () => {
    it('devrait créer un élève', async () => {
      mockStudentsService.create.mockResolvedValue(mockStudent);

      const result = await controller.create(
        mockCreateStudentDto as any,
        mockRequest as any,
      );

      expect(result).toEqual(mockStudent);
      expect(mockStudentsService.create).toHaveBeenCalledWith(
        mockCreateStudentDto,
        mockTenantId,
      );
    });
  });

  // ==================== FIND ALL ====================
  describe('findAll', () => {
    it('devrait retourner tous les élèves', async () => {
      mockStudentsService.findAll.mockResolvedValue([mockStudent]);

      const result = await controller.findAll(mockRequest as any);

      expect(result).toEqual([mockStudent]);
      expect(mockStudentsService.findAll).toHaveBeenCalledWith(
        mockTenantId,
        false,
      );
    });

    it('devrait inclure les archivés si query param présent', async () => {
      mockStudentsService.findAll.mockResolvedValue([mockStudent]);

      const result = await controller.findAll(mockRequest as any, 'true');

      expect(mockStudentsService.findAll).toHaveBeenCalledWith(
        mockTenantId,
        true,
      );
    });
  });

  // ==================== FIND ONE ====================
  describe('findOne', () => {
    it('devrait retourner un élève par ID', async () => {
      mockStudentsService.findOne.mockResolvedValue(mockStudent);

      const result = await controller.findOne(
        mockStudentId,
        mockRequest as any,
      );

      expect(result).toEqual(mockStudent);
      expect(mockStudentsService.findOne).toHaveBeenCalledWith(
        mockStudentId,
        mockTenantId,
      );
    });
  });

  // ==================== UPDATE ====================
  describe('update', () => {
    it('devrait mettre à jour un élève', async () => {
      const updatedStudent = { ...mockStudent, firstName: 'Julie' };
      mockStudentsService.update.mockResolvedValue(updatedStudent);

      const result = await controller.update(
        mockStudentId,
        { firstName: 'Julie' },
        mockRequest as any,
      );

      expect(result.firstName).toBe('Julie');
      expect(mockStudentsService.update).toHaveBeenCalledWith(
        mockStudentId,
        { firstName: 'Julie' },
        mockTenantId,
      );
    });
  });

  // ==================== ARCHIVE ====================
  describe('archive', () => {
    it('devrait archiver un élève', async () => {
      const archivedStudent = {
        ...mockStudent,
        archivedAt: new Date(),
        status: StudentStatus.ARCHIVED,
      };
      mockStudentsService.archive.mockResolvedValue(archivedStudent);

      const result = await controller.archive(
        mockStudentId,
        mockRequest as any,
      );

      expect(result.status).toBe(StudentStatus.ARCHIVED);
      expect(mockStudentsService.archive).toHaveBeenCalledWith(
        mockStudentId,
        mockTenantId,
      );
    });
  });

  // ==================== RESTORE ====================
  describe('restore', () => {
    it('devrait restaurer un élève', async () => {
      const restoredStudent = {
        ...mockStudent,
        archivedAt: null,
        status: StudentStatus.ACTIVE,
      };
      mockStudentsService.restore.mockResolvedValue(restoredStudent);

      const result = await controller.restore(
        mockStudentId,
        mockRequest as any,
      );

      expect(result.status).toBe(StudentStatus.ACTIVE);
      expect(mockStudentsService.restore).toHaveBeenCalledWith(
        mockStudentId,
        mockTenantId,
      );
    });
  });

  // ==================== REMOVE ====================
  describe('remove', () => {
    it('devrait supprimer un élève', async () => {
      mockStudentsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockStudentId, mockRequest as any);

      expect(mockStudentsService.remove).toHaveBeenCalledWith(
        mockStudentId,
        mockTenantId,
      );
    });
  });

  // ==================== HOURS ====================
  describe('getHours', () => {
    it('devrait retourner les heures avec calculs', async () => {
      mockStudentsService.getRemainingMinutes.mockResolvedValue(900);
      mockStudentsService.findOne.mockResolvedValue(mockStudent);

      const result = await controller.getHours(
        mockStudentId,
        mockRequest as any,
      );

      expect(result).toEqual({
        minutesPurchased: 1200,
        minutesUsed: 300,
        minutesRemaining: 900,
        hoursPurchased: 20,
        hoursUsed: 5,
        hoursRemaining: 15,
      });
    });
  });

  describe('addPurchasedHours', () => {
    it('devrait ajouter des heures achetées', async () => {
      const updatedStudent = { ...mockStudent, minutesPurchased: 1800 };
      mockStudentsService.addPurchasedMinutes.mockResolvedValue(updatedStudent);

      const result = await controller.addPurchasedHours(
        mockStudentId,
        600,
        mockRequest as any,
      );

      expect(result.minutesPurchased).toBe(1800);
      expect(mockStudentsService.addPurchasedMinutes).toHaveBeenCalledWith(
        mockStudentId,
        600,
        mockTenantId,
      );
    });
  });

  describe('addUsedHours', () => {
    it('devrait ajouter des heures consommées', async () => {
      const updatedStudent = { ...mockStudent, minutesUsed: 360 };
      mockStudentsService.addUsedMinutes.mockResolvedValue(updatedStudent);

      const result = await controller.addUsedHours(
        mockStudentId,
        60,
        mockRequest as any,
      );

      expect(result.minutesUsed).toBe(360);
      expect(mockStudentsService.addUsedMinutes).toHaveBeenCalledWith(
        mockStudentId,
        60,
        mockTenantId,
      );
    });
  });
});
