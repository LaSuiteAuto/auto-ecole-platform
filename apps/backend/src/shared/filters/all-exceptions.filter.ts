import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';

/**
 * Filtre global pour gérer toutes les exceptions
 *
 * Responsabilités :
 * 1. Catcher toutes les exceptions (HTTP et non-HTTP)
 * 2. Formater la réponse de manière cohérente
 * 3. Logger l'erreur pour debug
 * 4. Masquer les détails techniques en production
 * 5. Inclure le requestId pour traçabilité
 *
 * Format de réponse :
 * {
 *   "statusCode": 400,
 *   "error": "Bad Request",
 *   "message": "Email already used",
 *   "path": "/auth/register",
 *   "requestId": "abc123",
 *   "timestamp": "2026-01-22T10:00:00Z"
 * }
 *
 * Sécurité :
 * - En production : masque les stack traces
 * - En développement : affiche les détails techniques
 *
 * @example
 * // Dans app.module.ts
 * app.useGlobalFilters(new AllExceptionsFilter());
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Déterminer le status code
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Déterminer le message d'erreur
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        message = (exceptionResponse as any).message || message;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        error = (exceptionResponse as any).error || exception.name;
      }
    } else if (exception instanceof Error) {
      // Erreur non-HTTP (ex: erreur de base de données)
      message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;
    }

    // Construire la réponse d'erreur standardisée
    const errorResponse: ErrorResponse = {
      statusCode,
      error,
      message,
      path: request.url,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      requestId: (request as any).requestId,
      timestamp: new Date().toISOString(),
    };

    // Logger l'erreur
    this.logger.error(
      JSON.stringify({
        ...errorResponse,
        stack:
          process.env.NODE_ENV === 'development' && exception instanceof Error
            ? exception.stack
            : undefined,
      }),
    );

    // Envoyer la réponse
    response.status(statusCode).json(errorResponse);
  }
}
