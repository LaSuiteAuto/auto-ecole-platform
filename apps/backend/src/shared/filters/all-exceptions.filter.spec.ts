import { AllExceptionsFilter } from './all-exceptions.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Tests unitaires pour AllExceptionsFilter
 *
 * Couvre :
 * - Gestion des HttpException
 * - Gestion des erreurs génériques
 * - Format de réponse standardisé
 * - Inclusion du requestId
 * - Masquage des détails en production
 */
describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    // Mock de la réponse
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock de la requête
    mockRequest = {
      url: '/api/test',
      requestId: 'test-request-id',
    };

    // Mock de ArgumentsHost
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;

    // Mock du logger
    jest.spyOn(filter['logger'], 'error').mockImplementation();
  });

  describe('HttpException', () => {
    it('devrait formater une HttpException correctement', () => {
      const exception = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Bad Request',
          path: '/api/test',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        }),
      );
    });

    it('devrait gérer une HttpException avec objet de réponse', () => {
      const exception = new HttpException(
        {
          statusCode: 400,
          message: ['Email is required', 'Email must be valid'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: ['Email is required', 'Email must be valid'],
          error: 'Bad Request',
        }),
      );
    });

    it('devrait gérer un ConflictException', () => {
      const exception = new HttpException(
        'Email already used',
        HttpStatus.CONFLICT,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message: 'Email already used',
        }),
      );
    });
  });

  describe('Erreurs génériques', () => {
    it('devrait gérer une Error générique', () => {
      const exception = new Error('Database connection failed');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Database connection failed',
        }),
      );
    });

    it('devrait masquer les détails en production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exception = new Error('Secret database error');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('devrait afficher les détails en développement', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new Error('Detailed error message');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Detailed error message',
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('RequestId', () => {
    it('devrait inclure le requestId si présent', () => {
      mockRequest.requestId = 'custom-request-id';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'custom-request-id',
        }),
      );
    });

    it("devrait gérer l'absence de requestId", () => {
      mockRequest.requestId = undefined;
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: undefined,
        }),
      );
    });
  });

  describe('Timestamp', () => {
    it('devrait inclure un timestamp ISO', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs.timestamp).toBeDefined();
      expect(new Date(callArgs.timestamp).toISOString()).toBe(
        callArgs.timestamp,
      );
    });
  });

  describe('Logging', () => {
    it("devrait logger l'erreur", () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(filter['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('Test error'),
      );
    });
  });

  describe('Format de réponse', () => {
    it('devrait respecter le format ErrorResponse', () => {
      const exception = new HttpException('Test', HttpStatus.NOT_FOUND);

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
