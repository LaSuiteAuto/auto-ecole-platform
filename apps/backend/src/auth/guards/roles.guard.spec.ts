import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '../../shared/enums/role.enum';

/**
 * Tests unitaires pour RolesGuard
 *
 * Couvre :
 * - Autorisation sans @Roles (tous les authentifiés)
 * - Autorisation avec un seul rôle
 * - Autorisation avec plusieurs rôles
 * - Refus d'accès si rôle non autorisé
 * - Différents rôles (ADMIN, SECRETARY, INSTRUCTOR, STUDENT)
 */
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
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
     * Test 1 : Pas de @Roles decorator
     * Devrait autoriser tous les utilisateurs authentifiés
     */
    it("devrait autoriser l'accès si aucun rôle n'est requis", () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'user-123',
        role: Role.STUDENT,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 2 : Un seul rôle requis - Utilisateur a le bon rôle
     */
    it("devrait autoriser si l'utilisateur a le rôle ADMIN requis", () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'admin-123',
        role: Role.ADMIN,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 3 : Un seul rôle requis - Utilisateur n'a PAS le bon rôle
     */
    it("devrait refuser si l'utilisateur n'a pas le rôle ADMIN requis", () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'student-123',
        role: Role.STUDENT,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test 4 : Plusieurs rôles requis - Utilisateur a le premier rôle
     */
    it("devrait autoriser si l'utilisateur est ADMIN (parmi ADMIN, SECRETARY)", () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'admin-123',
        role: Role.ADMIN,
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.ADMIN, Role.SECRETARY]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 5 : Plusieurs rôles requis - Utilisateur a le deuxième rôle
     */
    it("devrait autoriser si l'utilisateur est SECRETARY (parmi ADMIN, SECRETARY)", () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'secretary-123',
        role: Role.SECRETARY,
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.ADMIN, Role.SECRETARY]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 6 : Plusieurs rôles requis - Utilisateur n'a aucun des rôles
     */
    it("devrait refuser si l'utilisateur est INSTRUCTOR (pas dans ADMIN, SECRETARY)", () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'instructor-123',
        role: Role.INSTRUCTOR,
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.ADMIN, Role.SECRETARY]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    /**
     * Test 7 : Vérification avec rôle INSTRUCTOR
     */
    it('devrait autoriser INSTRUCTOR pour une route INSTRUCTOR', () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'instructor-123',
        role: Role.INSTRUCTOR,
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.INSTRUCTOR]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 8 : Vérification avec rôle STUDENT
     */
    it('devrait autoriser STUDENT pour une route STUDENT', () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'student-123',
        role: Role.STUDENT,
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.STUDENT]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 9 : Tous les rôles autorisés
     */
    it('devrait autoriser STUDENT si tous les rôles sont requis', () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'student-123',
        role: Role.STUDENT,
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([
          Role.ADMIN,
          Role.SECRETARY,
          Role.INSTRUCTOR,
          Role.STUDENT,
        ]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 10 : Vérification que getAllAndOverride est appelé correctement
     */
    it('devrait appeler reflector.getAllAndOverride avec les bons paramètres', () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'admin-123',
        role: Role.ADMIN,
      });

      const spy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.ADMIN]);

      // Act
      guard.canActivate(mockContext);

      // Assert
      expect(spy).toHaveBeenCalledWith('roles', [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    /**
     * Test 11 : Cas limite - Tableau de rôles vide
     */
    it('devrait autoriser si le tableau de rôles est vide', () => {
      // Arrange
      const mockContext = createMockExecutionContext({
        userId: 'user-123',
        role: Role.STUDENT,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false); // Aucun rôle ne correspond
    });

    /**
     * Test 12 : Scénario réel - ADMIN/SECRETARY pour création élève
     */
    it('devrait autoriser ADMIN à créer un élève (route ADMIN/SECRETARY)', () => {
      // Arrange - Simule POST /students avec @Roles(ADMIN, SECRETARY)
      const mockContext = createMockExecutionContext({
        userId: 'admin-123',
        email: 'admin@autoecole.com',
        role: Role.ADMIN,
        tenantId: 'tenant-123',
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.ADMIN, Role.SECRETARY]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    /**
     * Test 13 : Scénario réel - STUDENT ne peut pas créer élève
     */
    it('devrait refuser STUDENT de créer un élève (route ADMIN/SECRETARY)', () => {
      // Arrange - Simule POST /students avec @Roles(ADMIN, SECRETARY)
      const mockContext = createMockExecutionContext({
        userId: 'student-123',
        email: 'student@autoecole.com',
        role: Role.STUDENT,
        tenantId: 'tenant-123',
      });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Role.ADMIN, Role.SECRETARY]);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });
  });
});
