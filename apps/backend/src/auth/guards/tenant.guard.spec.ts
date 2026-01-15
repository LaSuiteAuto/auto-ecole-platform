import { TenantGuard } from './tenant.guard';
import { ExecutionContext } from '@nestjs/common';

/**
 * Tests unitaires pour TenantGuard
 *
 * Couvre :
 * - Autorisation avec tenantId valide
 * - Refus sans tenantId
 * - Refus sans utilisateur
 * - Vérification de la sécurité multi-tenant
 */
describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  /**
   * Mock d'ExecutionContext
   */
  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    /**
     * Test 1 : Utilisateur avec tenantId valide
     */
    it("devrait autoriser si l'utilisateur a un tenantId", () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'user-123',
        email: 'admin@autoecole.com',
        tenantId: 'tenant-abc',
        role: 'ADMIN',
      });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 2 : Utilisateur sans tenantId
     */
    it("devrait refuser si l'utilisateur n'a pas de tenantId", () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'user-123',
        email: 'admin@autoecole.com',
        role: 'ADMIN',
        // tenantId manquant
      });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test 3 : TenantId null
     */
    it('devrait refuser si tenantId est null', () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'user-123',
        email: 'admin@autoecole.com',
        tenantId: null,
        role: 'ADMIN',
      });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test 4 : TenantId undefined
     */
    it('devrait refuser si tenantId est undefined', () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'user-123',
        email: 'admin@autoecole.com',
        tenantId: undefined,
        role: 'ADMIN',
      });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test 5 : TenantId vide
     */
    it('devrait refuser si tenantId est une chaîne vide', () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'user-123',
        email: 'admin@autoecole.com',
        tenantId: '',
        role: 'ADMIN',
      });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test 6 : Pas d'utilisateur du tout
     */
    it("devrait refuser si l'utilisateur n'existe pas", () => {
      // Arrange
      const mockContext = createMockExecutionContext(null);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test 7 : Utilisateur undefined
     */
    it("devrait refuser si l'utilisateur est undefined", () => {
      // Arrange
      const mockContext = createMockExecutionContext(undefined);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test 8 : Tous les rôles avec tenantId valide
     */
    it('devrait autoriser ADMIN avec tenantId', () => {
      const mockContext = createMockExecutionContext({
        userId: 'admin-123',
        tenantId: 'tenant-abc',
        role: 'ADMIN',
      });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('devrait autoriser SECRETARY avec tenantId', () => {
      const mockContext = createMockExecutionContext({
        userId: 'secretary-123',
        tenantId: 'tenant-abc',
        role: 'SECRETARY',
      });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('devrait autoriser INSTRUCTOR avec tenantId', () => {
      const mockContext = createMockExecutionContext({
        userId: 'instructor-123',
        tenantId: 'tenant-abc',
        role: 'INSTRUCTOR',
      });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('devrait autoriser STUDENT avec tenantId', () => {
      const mockContext = createMockExecutionContext({
        userId: 'student-123',
        tenantId: 'tenant-abc',
        role: 'STUDENT',
      });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    /**
     * Test 9 : TenantId avec différents formats valides
     */
    it('devrait autoriser avec un UUID valide', () => {
      const mockContext = createMockExecutionContext({
        userId: 'user-123',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'ADMIN',
      });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('devrait autoriser avec un tenantId alphanumérique', () => {
      const mockContext = createMockExecutionContext({
        userId: 'user-123',
        tenantId: 'tenant-abc-123',
        role: 'ADMIN',
      });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    /**
     * Test 10 : Scénario réel - Requête authentifiée
     */
    it('devrait autoriser une requête authentifiée avec JwtAuthGuard', () => {
      // Arrange - Simule un utilisateur chargé par JwtStrategy
      const mockContext = createMockExecutionContext({
        userId: 'user-uuid-123',
        email: 'admin@autoecole.com',
        tenantId: 'tenant-uuid-456',
        role: 'ADMIN',
      });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 11 : Sécurité - Empêcher accès sans tenant
     */
    it("devrait empêcher l'accès si req.user manque tenantId (sécurité)", () => {
      // Arrange - Utilisateur malformé
      const mockContext = createMockExecutionContext({
        userId: 'hacker-123',
        email: 'hacker@bad.com',
        role: 'ADMIN',
        // Pas de tenantId - tentative d'accès inter-tenant
      });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });
  });
});
