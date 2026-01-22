import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

/**
 * Interceptor pour logger toutes les requêtes HTTP
 *
 * Logs structurés avec :
 * - requestId unique (traçabilité)
 * - method + url
 * - status code
 * - duration (ms)
 * - userId + tenantId (si authentifié)
 *
 * Format JSON pour faciliter l'analyse et les outils de monitoring
 *
 * Exemple de log :
 * {
 *   "requestId": "550e8400-e29b-41d4-a716-446655440000",
 *   "method": "POST",
 *   "url": "/auth/login",
 *   "statusCode": 200,
 *   "duration": 145,
 *   "userId": "user-123",
 *   "tenantId": "tenant-abc",
 *   "timestamp": "2026-01-22T10:30:00.000Z"
 * }
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = context.switchToHttp().getResponse();

    // Génération d'un requestId unique pour traçabilité
    const requestId = randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    request.requestId = requestId;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { method, url, user } = request;
    const startTime = Date.now();

    // Log de la requête entrante
    this.logger.log(
      JSON.stringify({
        requestId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        method,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        url,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        userId: user?.userId || null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        tenantId: user?.tenantId || null,
        type: 'request',
      }),
    );

    return next.handle().pipe(
      tap({
        next: () => {
          // Log de la réponse réussie
          const duration = Date.now() - startTime;
          this.logger.log(
            JSON.stringify({
              requestId,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              method,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              url,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              statusCode: response.statusCode,
              duration,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              userId: user?.userId || null,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              tenantId: user?.tenantId || null,
              type: 'response',
              timestamp: new Date().toISOString(),
            }),
          );
        },
        error: (error) => {
          // Log de l'erreur
          const duration = Date.now() - startTime;
          this.logger.error(
            JSON.stringify({
              requestId,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              method,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              url,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              statusCode: error.status || 500,
              duration,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              userId: user?.userId || null,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              tenantId: user?.tenantId || null,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              error: error.message,
              type: 'error',
              timestamp: new Date().toISOString(),
            }),
          );
        },
      }),
    );
  }
}
