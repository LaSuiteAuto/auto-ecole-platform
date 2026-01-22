import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

/**
 * Tests unitaires pour RequestLoggingInterceptor
 *
 * Couvre :
 * - Logging des requêtes réussies
 * - Logging des erreurs
 * - Présence du requestId
 * - Logging avec utilisateur authentifié
 * - Logging sans utilisateur (requête publique)
 * - Calcul de la durée
 */
describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new RequestLoggingInterceptor();

    // Mock du logger pour éviter les logs en console pendant les tests
    jest.spyOn(interceptor['logger'], 'log').mockImplementation();
    jest.spyOn(interceptor['logger'], 'error').mockImplementation();
  });

  const createMockContext = (
    request: any = {},
    response: any = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('Requêtes réussies', () => {
    it('devrait logger une requête réussie avec requestId', (done) => {
      const mockRequest: any = {
        method: 'GET',
        url: '/api/students',
        user: {
          userId: 'user-123',
          tenantId: 'tenant-abc',
        },
      };

      const mockResponse = {
        statusCode: 200,
      };

      mockExecutionContext = createMockContext(mockRequest, mockResponse);
      mockCallHandler = {
        handle: () => of({ data: 'test' }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          // Vérifier que le requestId a été ajouté
          expect(mockRequest.requestId).toBeDefined();
          expect(typeof mockRequest.requestId).toBe('string');

          // Vérifier les logs
          expect(interceptor['logger'].log).toHaveBeenCalledTimes(2);

          // Premier appel : log de la requête entrante
          const firstCall = (interceptor['logger'].log as jest.Mock).mock
            .calls[0][0];
          const firstLog = JSON.parse(firstCall);
          expect(firstLog.type).toBe('request');
          expect(firstLog.method).toBe('GET');
          expect(firstLog.url).toBe('/api/students');
          expect(firstLog.userId).toBe('user-123');
          expect(firstLog.tenantId).toBe('tenant-abc');

          // Second appel : log de la réponse
          const secondCall = (interceptor['logger'].log as jest.Mock).mock
            .calls[1][0];
          const secondLog = JSON.parse(secondCall);
          expect(secondLog.type).toBe('response');
          expect(secondLog.statusCode).toBe(200);
          expect(secondLog.duration).toBeGreaterThanOrEqual(0);

          done();
        },
      });
    });

    it('devrait logger une requête publique sans userId', (done) => {
      const mockRequest = {
        method: 'POST',
        url: '/auth/login',
        user: undefined,
      };

      const mockResponse = {
        statusCode: 200,
      };

      mockExecutionContext = createMockContext(mockRequest, mockResponse);
      mockCallHandler = {
        handle: () => of({ token: 'jwt' }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const firstCall = (interceptor['logger'].log as jest.Mock).mock
            .calls[0][0];
          const firstLog = JSON.parse(firstCall);

          expect(firstLog.userId).toBeNull();
          expect(firstLog.tenantId).toBeNull();

          done();
        },
      });
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait logger une erreur avec le bon status code', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/students/invalid',
        user: {
          userId: 'user-123',
          tenantId: 'tenant-abc',
        },
      };

      const mockResponse = {
        statusCode: 500,
      };

      const error = {
        status: 404,
        message: 'Not Found',
      };

      mockExecutionContext = createMockContext(mockRequest, mockResponse);
      mockCallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          // Vérifier le log d'erreur
          expect(interceptor['logger'].error).toHaveBeenCalledTimes(1);

          const errorCall = (interceptor['logger'].error as jest.Mock).mock
            .calls[0][0];
          const errorLog = JSON.parse(errorCall);

          expect(errorLog.type).toBe('error');
          expect(errorLog.statusCode).toBe(404);
          expect(errorLog.error).toBe('Not Found');
          expect(errorLog.duration).toBeGreaterThanOrEqual(0);

          done();
        },
      });
    });

    it('devrait utiliser 500 par défaut si pas de status code', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
      };

      const mockResponse = {
        statusCode: 500,
      };

      const error = {
        message: 'Unknown error',
      };

      mockExecutionContext = createMockContext(mockRequest, mockResponse);
      mockCallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          const errorCall = (interceptor['logger'].error as jest.Mock).mock
            .calls[0][0];
          const errorLog = JSON.parse(errorCall);

          expect(errorLog.statusCode).toBe(500);

          done();
        },
      });
    });
  });

  describe('Calcul de la durée', () => {
    it('devrait calculer la durée de la requête', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
      };

      const mockResponse = {
        statusCode: 200,
      };

      mockExecutionContext = createMockContext(mockRequest, mockResponse);
      mockCallHandler = {
        handle: () => {
          // Simuler un délai
          return of({ data: 'test' });
        },
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const responseCall = (interceptor['logger'].log as jest.Mock).mock
            .calls[1][0];
          const responseLog = JSON.parse(responseCall);

          expect(responseLog.duration).toBeGreaterThanOrEqual(0);
          expect(typeof responseLog.duration).toBe('number');

          done();
        },
      });
    });
  });

  describe('Format des logs', () => {
    it('devrait produire des logs au format JSON valide', (done) => {
      const mockRequest = {
        method: 'POST',
        url: '/api/students',
        user: {
          userId: 'user-123',
          tenantId: 'tenant-abc',
        },
      };

      const mockResponse = {
        statusCode: 201,
      };

      mockExecutionContext = createMockContext(mockRequest, mockResponse);
      mockCallHandler = {
        handle: () => of({ id: 'student-1' }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const calls = (interceptor['logger'].log as jest.Mock).mock.calls;

          // Vérifier que chaque log est un JSON valide
          calls.forEach((call) => {
            expect(() => JSON.parse(call[0])).not.toThrow();
          });

          done();
        },
      });
    });

    it('devrait inclure un timestamp ISO dans les logs de réponse', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
      };

      const mockResponse = {
        statusCode: 200,
      };

      mockExecutionContext = createMockContext(mockRequest, mockResponse);
      mockCallHandler = {
        handle: () => of({ data: 'test' }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const responseCall = (interceptor['logger'].log as jest.Mock).mock
            .calls[1][0];
          const responseLog = JSON.parse(responseCall);

          expect(responseLog.timestamp).toBeDefined();
          expect(new Date(responseLog.timestamp).toISOString()).toBe(
            responseLog.timestamp,
          );

          done();
        },
      });
    });
  });
});
