import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentDto } from './create-student.dto';
import { IsOptional, IsDateString } from 'class-validator';

/**
 * DTO pour la mise à jour d'un élève
 *
 * Tous les champs deviennent optionnels grâce à PartialType
 * On ajoute juste le champ archivedAt pour gérer l'archivage
 */
export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  /**
   * Date d'archivage de l'élève
   * Null = élève actif, Date = élève archivé
   * @example "2026-01-26T10:30:00.000Z"
   */
  @IsDateString()
  @IsOptional()
  archivedAt?: string | null;
}
