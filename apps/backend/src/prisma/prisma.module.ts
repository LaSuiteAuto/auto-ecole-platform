import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Module Prisma - Global
 *
 * @Global : rend le PrismaService disponible dans toute l'application
 * sans avoir besoin de l'importer dans chaque module
 *
 * Utilisation dans d'autres modules :
 * ```typescript
 * constructor(private prisma: PrismaService) {}
 * ```
 *
 * Pas besoin de l'ajouter dans les imports des autres modules
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
