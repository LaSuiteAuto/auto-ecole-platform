import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Service Prisma pour l'accès à la base de données
 *
 * Responsabilités :
 * - Initialise la connexion Prisma avec l'adapter PostgreSQL
 * - Gère le cycle de vie de la connexion
 * - Fournit le client Prisma à tous les services
 *
 * Pattern NestJS :
 * - OnModuleInit : connexion au démarrage
 * - OnModuleDestroy : déconnexion propre à l'arrêt
 *
 * Multi-tenant :
 * - Toutes les requêtes doivent filtrer par tenantId
 * - Utiliser les RLS (Row Level Security) en production
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Configuration de l'adapter PostgreSQL (requis par Prisma 7)
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      // Logs en développement (désactiver en production)
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  /**
   * Connexion à la base de données au démarrage du module
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Déconnexion propre lors de l'arrêt de l'application
   * Évite les connexions orphelines
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
