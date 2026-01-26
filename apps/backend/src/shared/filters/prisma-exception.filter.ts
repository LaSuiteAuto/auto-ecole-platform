import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';

/**
 * Filtre pour gérer les erreurs Prisma et les convertir en erreurs HTTP
 *
 * Mapping des erreurs Prisma courantes :
 * - P2002 : Unique constraint violation → 409 Conflict
 * - P2025 : Record not found → 404 Not Found
 * - P2003 : Foreign key constraint violation → 400 Bad Request
 * - Autres : 500 Internal Server Error (masqué en production)
 *
 * Exemple :
 * ```typescript
 * // Tentative de créer un utilisateur avec email existant
 * await prisma.user.create({
 *   data: { email: 'existing@example.com' }
 * });
 * // → Prisma lance P2002
 * // → Ce filtre retourne : 409 Conflict "Email already used"
 * ```
 *
 * Sécurité :
 * - Messages techniques masqués en production
 * - Pas de stack trace exposée
 * - Détails uniquement en développement
 *
 * @example
 * // Dans app.module.ts
 * app.useGlobalFilters(
 *   new PrismaExceptionFilter(),
 *   new AllExceptionsFilter(),
 * );
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // Mapping des codes d'erreur Prisma
    switch (exception.code) {
      case 'P2002':
        // Unique constraint violation
        status = HttpStatus.CONFLICT;
        error = 'Conflict';
        message = this.getUniqueConstraintMessage(exception);
        break;

      case 'P2025':
        // Record not found
        status = HttpStatus.NOT_FOUND;
        error = 'Not Found';
        message = this.getNotFoundMessage(exception);
        break;

      case 'P2003':
        // Foreign key constraint violation
        status = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        message = this.getForeignKeyMessage(exception);
        break;

      case 'P2014':
        // Required relation violation
        status = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        message = 'Invalid relation data';
        break;

      default:
        // Erreur Prisma inconnue - masquer en production
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        error = 'Internal Server Error';
        message =
          process.env.NODE_ENV === 'production'
            ? 'Database error'
            : `Prisma error: ${exception.code} - ${exception.message}`;
    }

    // Construire la réponse d'erreur
    const errorResponse: ErrorResponse = {
      statusCode: status,
      error,
      message,
      path: request.url,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      requestId: (request as any).requestId,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Extrait un message lisible pour les contraintes unique
   */
  private getUniqueConstraintMessage(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    // Prisma meta contient le champ en conflit
    const meta = exception.meta as { target?: string[] };
    const field = meta?.target?.[0];

    if (field) {
      // Convertir le nom du champ en message lisible
      const fieldMessages: Record<string, string> = {
        email: 'Email already used',
        username: 'Username already taken',
        phone: 'Phone number already registered',
      };

      return fieldMessages[field] || `${field} already exists`;
    }

    return 'Resource already exists';
  }

  /**
   * Extrait un message lisible pour les ressources non trouvées
   */
  private getNotFoundMessage(
    _exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    // On pourrait parser exception.meta pour plus de détails
    return 'Resource not found';
  }

  /**
   * Extrait un message lisible pour les violations de clé étrangère
   */
  private getForeignKeyMessage(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string {
    const meta = exception.meta as { field_name?: string };
    const field = meta?.field_name;

    if (field) {
      return `Invalid reference: ${field}`;
    }

    return 'Invalid reference to related resource';
  }
}
