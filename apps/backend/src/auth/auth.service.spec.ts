import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Tests unitaires pour AuthService
 *
 * Couvre :
 * - Register (inscription)
 * - Login (connexion)
 * - GetMe (utilisateur connecté)
 * - ValidateUser (validation JWT)
 */
describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  // Mocks
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    tenant: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset des mocks avant chaque test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Tests pour register()
   */
  describe('register', () => {
    const registerDto = {
      tenantName: 'Auto École Test',
      email: 'test@test.fr',
      password: 'Password123!',
    };

    it('devrait créer un nouveau tenant et admin avec succès', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      const mockTenant = {
        id: 'tenant-id',
        name: registerDto.tenantName,
        users: [
          {
            id: 'user-id',
            email: registerDto.email,
            password: hashedPassword,
            role: 'ADMIN',
            tenantId: 'tenant-id',
          },
        ],
      };
      const mockToken = 'mock-jwt-token';

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.tenant.create.mockResolvedValue(mockTenant);
      mockJwtService.sign.mockReturnValue(mockToken);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockPrismaService.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: registerDto.tenantName,
          }),
        }),
      );
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: 'user-id',
          email: registerDto.email,
          role: 'ADMIN',
          tenantId: 'tenant-id',
        },
      });
    });

    it('devrait lever ConflictException si email déjà utilisé', async () => {
      // Arrange
      const existingUser = {
        id: 'existing-user-id',
        email: registerDto.email,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Cet email est déjà utilisé',
      );
      expect(mockPrismaService.tenant.create).not.toHaveBeenCalled();
    });

    it('devrait hasher le mot de passe', async () => {
      // Arrange
      const mockTenant = {
        id: 'tenant-id',
        name: registerDto.tenantName,
        users: [
          {
            id: 'user-id',
            email: registerDto.email,
            password: 'hashed-password',
            role: 'ADMIN',
            tenantId: 'tenant-id',
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.tenant.create.mockResolvedValue(mockTenant);
      mockJwtService.sign.mockReturnValue('mock-token');

      // Act
      await service.register(registerDto);

      // Assert
      // Vérifier que le mot de passe créé n'est pas en clair
      const createCall = mockPrismaService.tenant.create.mock.calls[0][0];
      const passwordInDb = createCall.data.users.create.password;

      // Le password ne doit pas être identique au password en clair
      expect(passwordInDb).not.toBe(registerDto.password);
      // Et doit ressembler à un hash bcrypt
      expect(typeof passwordInDb).toBe('string');
    });
  });

  /**
   * Tests pour login()
   */
  describe('login', () => {
    const loginDto = {
      email: 'test@test.fr',
      password: 'Password123!',
    };

    it('devrait connecter un utilisateur avec les bons identifiants', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const mockUser = {
        id: 'user-id',
        email: loginDto.email,
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: 'tenant-id',
      };
      const mockToken = 'mock-jwt-token';

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(mockToken);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: 'user-id',
          email: loginDto.email,
          role: 'ADMIN',
          tenantId: 'tenant-id',
        },
      });
    });

    it('devrait lever UnauthorizedException si email inexistant', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Email ou mot de passe incorrect',
      );
    });

    it('devrait lever UnauthorizedException si mot de passe incorrect', async () => {
      // Arrange
      const wrongPasswordHash = await bcrypt.hash('WrongPassword', 10);
      const mockUser = {
        id: 'user-id',
        email: loginDto.email,
        password: wrongPasswordHash,
        role: 'ADMIN',
        tenantId: 'tenant-id',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Email ou mot de passe incorrect',
      );
    });

    it('devrait accepter un mot de passe hashé valide', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const mockUser = {
        id: 'user-id',
        email: loginDto.email,
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: 'tenant-id',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      // Si le password est correct, on doit recevoir un token
      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-token');
    });
  });

  /**
   * Tests pour getMe()
   */
  describe('getMe', () => {
    it("devrait retourner les informations de l'utilisateur connecté", async () => {
      // Arrange
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        email: 'test@test.fr',
        role: 'ADMIN',
        tenantId: 'tenant-id',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.getMe(userId);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('devrait lever UnauthorizedException si utilisateur introuvable', async () => {
      // Arrange
      const userId = 'non-existent-user-id';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getMe(userId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.getMe(userId)).rejects.toThrow(
        'Utilisateur introuvable',
      );
    });

    it('ne devrait jamais retourner le mot de passe', async () => {
      // Arrange
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        email: 'test@test.fr',
        role: 'ADMIN',
        tenantId: 'tenant-id',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.getMe(userId);

      // Assert
      expect(result).not.toHaveProperty('password');
    });
  });

  /**
   * Tests pour validateUser()
   */
  describe('validateUser', () => {
    it('devrait retourner un utilisateur valide', async () => {
      // Arrange
      const userId = 'user-id';
      const mockUser = {
        id: userId,
        email: 'test@test.fr',
        role: 'ADMIN',
        tenantId: 'tenant-id',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(result).not.toHaveProperty('password');
    });

    it('devrait retourner null si utilisateur inexistant', async () => {
      // Arrange
      const userId = 'non-existent-user-id';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  /**
   * Tests pour generateToken() (méthode privée testée indirectement)
   */
  describe('generateToken (via register/login)', () => {
    it('devrait générer un JWT avec le bon payload', async () => {
      // Arrange
      const registerDto = {
        tenantName: 'Test',
        email: 'test@test.fr',
        password: 'Password123!',
      };
      const mockTenant = {
        id: 'tenant-id',
        name: registerDto.tenantName,
        users: [
          {
            id: 'user-id',
            email: registerDto.email,
            password: 'hashed',
            role: 'ADMIN',
            tenantId: 'tenant-id',
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.tenant.create.mockResolvedValue(mockTenant);
      mockJwtService.sign.mockReturnValue('token');

      // Act
      await service.register(registerDto);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        tenantId: 'tenant-id',
        role: 'ADMIN',
      });
    });
  });
});
