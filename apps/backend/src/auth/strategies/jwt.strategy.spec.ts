import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';
import { JwtPayload } from './jwt.strategy';

/**
 * Tests unitaires pour JwtStrategy
 *
 * Couvre :
 * - Validation du payload JWT
 * - Vérification de l'existence de l'utilisateur
 * - Gestion des utilisateurs invalides/supprimés
 */
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: AuthService;

  // Mock du AuthService
  const mockAuthService = {
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);

    // Reset des mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  /**
   * Tests pour validate()
   */
  describe('validate', () => {
    it('devrait valider un payload JWT valide et retourner les infos utilisateur', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-id-123',
        tenantId: 'tenant-id-456',
        role: 'ADMIN',
        iat: 1234567890,
        exp: 9999999999,
      };

      const mockUser = {
        id: 'user-id-123',
        email: 'test@test.fr',
        role: 'ADMIN',
        tenantId: 'tenant-id-456',
      };

      mockAuthService.validateUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(authService.validateUser).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        role: mockUser.role,
      });
    });

    it("devrait lever UnauthorizedException si l'utilisateur n'existe pas", async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'non-existent-user-id',
        tenantId: 'tenant-id',
        role: 'ADMIN',
      };

      mockAuthService.validateUser.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Utilisateur invalide ou supprimé',
      );
    });

    it("devrait lever UnauthorizedException si l'utilisateur a été supprimé", async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'deleted-user-id',
        tenantId: 'tenant-id',
        role: 'STUDENT',
      };

      mockAuthService.validateUser.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("devrait gérer différents rôles d'utilisateurs", async () => {
      // Test INSTRUCTOR
      const instructorPayload: JwtPayload = {
        sub: 'instructor-id',
        tenantId: 'tenant-id',
        role: 'INSTRUCTOR',
      };

      const mockInstructor = {
        id: 'instructor-id',
        email: 'instructor@test.fr',
        role: 'INSTRUCTOR',
        tenantId: 'tenant-id',
      };

      mockAuthService.validateUser.mockResolvedValue(mockInstructor);

      const instructorResult = await strategy.validate(instructorPayload);
      expect(instructorResult.role).toBe('INSTRUCTOR');

      // Test STUDENT
      const studentPayload: JwtPayload = {
        sub: 'student-id',
        tenantId: 'tenant-id',
        role: 'STUDENT',
      };

      const mockStudent = {
        id: 'student-id',
        email: 'student@test.fr',
        role: 'STUDENT',
        tenantId: 'tenant-id',
      };

      mockAuthService.validateUser.mockResolvedValue(mockStudent);

      const studentResult = await strategy.validate(studentPayload);
      expect(studentResult.role).toBe('STUDENT');

      // Test SECRETARY
      const secretaryPayload: JwtPayload = {
        sub: 'secretary-id',
        tenantId: 'tenant-id',
        role: 'SECRETARY',
      };

      const mockSecretary = {
        id: 'secretary-id',
        email: 'secretary@test.fr',
        role: 'SECRETARY',
        tenantId: 'tenant-id',
      };

      mockAuthService.validateUser.mockResolvedValue(mockSecretary);

      const secretaryResult = await strategy.validate(secretaryPayload);
      expect(secretaryResult.role).toBe('SECRETARY');
    });

    it('devrait retourner les données pour req.user', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-id',
        tenantId: 'tenant-id',
        role: 'ADMIN',
      };

      const mockUser = {
        id: 'user-id',
        email: 'admin@test.fr',
        role: 'ADMIN',
        tenantId: 'tenant-id',
      };

      mockAuthService.validateUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      // Ces données seront disponibles dans req.user
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('role');
      expect(result).not.toHaveProperty('password');
    });

    it("devrait vérifier que l'utilisateur existe toujours en base", async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-id',
        tenantId: 'tenant-id',
        role: 'ADMIN',
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@test.fr',
        role: 'ADMIN',
        tenantId: 'tenant-id',
      };

      mockAuthService.validateUser.mockResolvedValue(mockUser);

      // Act
      await strategy.validate(payload);

      // Assert
      // Vérifie que la validation appelle bien le service pour vérifier l'existence
      expect(authService.validateUser).toHaveBeenCalledWith(payload.sub);
      expect(authService.validateUser).toHaveBeenCalledTimes(1);
    });
  });
});
