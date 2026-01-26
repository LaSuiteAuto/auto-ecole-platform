import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter, PrismaExceptionFilter } from './shared/filters';

/**
 * Bootstrap de l'application NestJS
 *
 * Configuration :
 * - Validation automatique des DTOs
 * - Gestion globale des erreurs
 * - CORS activé (à configurer selon les besoins)
 * - Port : 3000 (par défaut)
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Gestion globale des exceptions
  // Ordre important : PrismaExceptionFilter avant AllExceptionsFilter
  app.useGlobalFilters(new PrismaExceptionFilter(), new AllExceptionsFilter());

  // Validation automatique des DTOs avec class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      // Supprime les propriétés non définies dans le DTO
      whitelist: true,

      // Rejette les requêtes avec des propriétés inconnues
      forbidNonWhitelisted: true,

      // Transforme automatiquement les types (ex: string -> number)
      transform: true,

      // Messages d'erreur détaillés en développement
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // Configuration CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application démarrée sur http://localhost:${port}`);
  console.log(`📚 Endpoints disponibles :`);
  console.log(`   POST http://localhost:${port}/auth/register`);
  console.log(`   POST http://localhost:${port}/auth/login`);
  console.log(`   GET  http://localhost:${port}/auth/me`);
}

void bootstrap();
