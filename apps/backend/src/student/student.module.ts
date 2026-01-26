import { Module } from '@nestjs/common';
import { StudentsService } from './student.service';
import { StudentsController } from './student.controller';

/**
 * Module de gestion des élèves
 *
 * - CRUD complet (création, lecture, mise à jour, suppression)
 * - Archivage / Restauration
 * - Gestion des heures (achat, consommation)
 *
 * Accès : ADMIN et SECRETARY uniquement
 */
@Module({
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService], // Pour utiliser dans d'autres modules si besoin
})
export class StudentsModule {}
