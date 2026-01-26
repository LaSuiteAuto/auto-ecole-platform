import { PrismaExceptionFilter } from './prisma-exception.filter';
import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Tests unitaires pour PrismaExceptionFilter
 *
 * Couvre :
 * - Mapping P2002 (unique constraint) → 409 Conflict
 * - Mapping P2025 (not found) → 404 Not Found
 * - Mapping P2003 (foreign key) → 400 Bad Request
 * - Mapping P2014 (relation) → 400 Bad Request
 * - Erreurs Prisma inconnues → 500 Internal Server Error
 * - Messages lisibles pour l'utilisateur
 */
describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/users',
      requestId: 'test-request-id',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  describe('P2002 - Unique constraint violation', () => {
    it('devrait retourner 409 Conflict pour un email déjà utilisé', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '7.2.0',
          meta: { target: ['email'] },
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          error: 'Conflict',
          message: 'Email already used',
          path: '/api/users',
        }),
      );
    });

    it('devrait retourner un message générique si le champ est inconnu', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.2.0',
          meta: { target: ['customField'] },
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'customField already exists',
        }),
      );
    });

    it("devrait gérer l'absence de meta.target", () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.2.0',
          meta: {},
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Resource already exists',
        }),
      );
    });
  });

  describe('P2025 - Record not found', () => {
    it('devrait retourner 404 Not Found', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found',
        {
          code: 'P2025',
          clientVersion: '7.2.0',
          meta: {},
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          error: 'Not Found',
          message: 'Resource not found',
        }),
      );
    });
  });

  describe('P2003 - Foreign key constraint', () => {
    it('devrait retourner 400 Bad Request', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '7.2.0',
          meta: { field_name: 'tenantId' },
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid reference: tenantId',
        }),
      );
    });

    it("devrait gérer l'absence de field_name", () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '7.2.0',
          meta: {},
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid reference to related resource',
        }),
      );
    });
  });

  describe('P2014 - Required relation violation', () => {
    it('devrait retourner 400 Bad Request', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Required relation violation',
        {
          code: 'P2014',
          clientVersion: '7.2.0',
          meta: {},
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid relation data',
        }),
      );
    });
  });

  describe('Erreurs Prisma inconnues', () => {
    it('devrait retourner 500 pour un code inconnu', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unknown error',
        {
          code: 'P9999',
          clientVersion: '7.2.0',
          meta: {},
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'Internal Server Error',
        }),
      );
    });

    it('devrait masquer les détails en production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exception = new Prisma.PrismaClientKnownRequestError(
        'Secret database error',
        {
          code: 'P9999',
          clientVersion: '7.2.0',
          meta: {},
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database error',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('devrait afficher les détails en développement', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new Prisma.PrismaClientKnownRequestError(
        'Detailed error',
        {
          code: 'P9999',
          clientVersion: '7.2.0',
          meta: {},
        },
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('P9999'),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Format de réponse', () => {
    it('devrait inclure le requestId', () => {
      const exception = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '7.2.0',
        meta: { target: ['email'] },
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-request-id',
        }),
      );
    });

    it('devrait inclure un timestamp ISO', () => {
      const exception = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '7.2.0',
        meta: { target: ['email'] },
      });

      filter.catch(exception, mockHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs.timestamp).toBeDefined();
      expect(new Date(callArgs.timestamp).toISOString()).toBe(
        callArgs.timestamp,
      );
    });

    it('devrait respecter le format ErrorResponse', () => {
      const exception = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '7.2.0',
        meta: { target: ['email'] },
      });

      filter.catch(exception, mockHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs).toHaveProperty('statusCode');
      expect(callArgs).toHaveProperty('error');
      expect(callArgs).toHaveProperty('message');
      expect(callArgs).toHaveProperty('path');
      expect(callArgs).toHaveProperty('timestamp');
    });
  });
});
