import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * Tests unitaires pour AuthController
 *
 * Couvre :
 * - POST /auth/register
 * - POST /auth/login
 * - GET /auth/me
 */
describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Mock du AuthService
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    getMe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Reset des mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /**
   * Tests pour POST /auth/register
   */
  describe('register', () => {
    it('devrait appeler authService.register avec les bonnes données', async () => {
      // Arrange
      const registerDto: RegisterDto = {
        tenantName: 'Auto École Test',
        email: 'test@test.fr',
        password: 'Password123!',
      };

      const expectedResult = {
        access_token: 'mock-token',
        user: {
          id: 'user-id',
          email: registerDto.email,
          role: 'ADMIN',
          tenantId: 'tenant-id',
        },
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('devrait retourner un token JWT et les infos utilisateur', async () => {
      // Arrange
      const registerDto: RegisterDto = {
        tenantName: 'Test Auto École',
        email: 'new@test.fr',
        password: 'SecurePass123!',
      };

      const mockResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'uuid-123',
          email: 'new@test.fr',
          role: 'ADMIN',
          tenantId: 'tenant-uuid',
        },
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('role');
      expect(result.user).toHaveProperty('tenantId');
      expect(result.user.role).toBe('ADMIN');
    });

    it('devrait propager les erreurs du service', async () => {
      // Arrange
      const registerDto: RegisterDto = {
        tenantName: 'Test',
        email: 'existing@test.fr',
        password: 'Password123!',
      };

      const error = new Error('Cet email est déjà utilisé');
      mockAuthService.register.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.register(registerDto)).rejects.toThrow(error);
    });
  });

  /**
   * Tests pour POST /auth/login
   */
  describe('login', () => {
    it('devrait appeler authService.login avec les bonnes données', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'test@test.fr',
        password: 'Password123!',
      };

      const expectedResult = {
        access_token: 'mock-token',
        user: {
          id: 'user-id',
          email: loginDto.email,
          role: 'ADMIN',
          tenantId: 'tenant-id',
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('devrait retourner un token JWT et les infos utilisateur', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'admin@test.fr',
        password: 'AdminPass123!',
      };

      const mockResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'admin-uuid',
          email: 'admin@test.fr',
          role: 'ADMIN',
          tenantId: 'tenant-uuid',
        },
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('devrait propager les erreurs du service', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'wrong@test.fr',
        password: 'WrongPassword',
      };

      const error = new Error('Email ou mot de passe incorrect');
      mockAuthService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.login(loginDto)).rejects.toThrow(error);
    });
  });

  /**
   * Tests pour GET /auth/me
   */
  describe('getMe', () => {
    it('devrait appeler authService.getMe avec le userId', async () => {
      // Arrange
      const currentUser = {
        userId: 'user-id-123',
        email: 'test@test.fr',
        tenantId: 'tenant-id',
        role: 'ADMIN',
      };

      const expectedResult = {
        id: currentUser.userId,
        email: currentUser.email,
        role: currentUser.role,
        tenantId: currentUser.tenantId,
        createdAt: new Date(),
      };

      mockAuthService.getMe.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getMe(currentUser);

      // Assert
      expect(authService.getMe).toHaveBeenCalledWith(currentUser.userId);
      expect(authService.getMe).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it("devrait retourner les informations complètes de l'utilisateur", async () => {
      // Arrange
      const currentUser = {
        userId: 'user-id',
        email: 'instructor@test.fr',
        tenantId: 'tenant-id',
        role: 'INSTRUCTOR',
      };

      const mockResponse = {
        id: 'user-id',
        email: 'instructor@test.fr',
        role: 'INSTRUCTOR',
        tenantId: 'tenant-id',
        createdAt: new Date('2026-01-13'),
      };

      mockAuthService.getMe.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getMe(currentUser);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('password');
    });

    it('devrait propager les erreurs du service', async () => {
      // Arrange
      const currentUser = {
        userId: 'non-existent-id',
        email: 'test@test.fr',
        tenantId: 'tenant-id',
        role: 'ADMIN',
      };

      const error = new Error('Utilisateur introuvable');
      mockAuthService.getMe.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getMe(currentUser)).rejects.toThrow(error);
    });
  });
});
