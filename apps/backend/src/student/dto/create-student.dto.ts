import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsPhoneNumber,
  Min,
  MinLength,
} from 'class-validator';
import { LicenseType, StudentStatus } from '@prisma/client';

/**
 * DTO pour la création d'un élève
 *
 * Valide toutes les données d'identité, contact et formation
 * conformément aux exigences ANTS et pédagogiques
 */
export class CreateStudentDto {
  // ========== A. IDENTITÉ (État Civil) ==========

  /**
   * Nom de naissance (nom de jeune fille si applicable)
   * @example "DUPONT"
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  birthName: string;

  /**
   * Prénom
   * @example "Marie"
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName: string;

  /**
   * Date de naissance au format ISO 8601
   * @example "2005-03-15"
   */
  @IsDateString()
  @IsNotEmpty()
  birthDate: string;

  /**
   * Ville de naissance
   * @example "Paris"
   */
  @IsString()
  @IsNotEmpty()
  birthCity: string;

  /**
   * Code postal de la ville de naissance
   * Optionnel si né à l'étranger
   * @example "75001"
   */
  @IsString()
  @IsOptional()
  birthZipCode?: string;

  /**
   * Pays de naissance
   * @example "FRANCE"
   */
  @IsString()
  @IsNotEmpty()
  birthCountry: string = 'FRANCE';

  // ========== B. CONTACT & ADRESSE ==========

  /**
   * Adresse postale complète
   * @example "12 rue de la République"
   */
  @IsString()
  @IsNotEmpty()
  address: string;

  /**
   * Ville de résidence
   * @example "Lyon"
   */
  @IsString()
  @IsNotEmpty()
  city: string;

  /**
   * Code postal
   * @example "69001"
   */
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  /**
   * Numéro de téléphone portable
   * Format international recommandé
   * @example "+33612345678" ou "0612345678"
   */
  @IsPhoneNumber('FR')
  @IsNotEmpty()
  phone: string;

  /**
   * Email de l'élève
   * Sera utilisé pour créer le compte User associé
   * @example "marie.dupont@example.com"
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * Mot de passe pour le compte élève
   * Minimum 8 caractères
   */
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  // ========== C. DOCUMENTS & CONFORMITÉ ANTS ==========

  /**
   * Numéro NEPH (Numéro d'Enregistrement Préfectoral Harmonisé)
   * 12 chiffres, unique
   * @example "123456789012"
   */
  @IsString()
  @IsOptional()
  neph?: string;

  /**
   * Code e-photo (pour signature électronique ANTS)
   * @example "ABCD1234EFGH5678"
   */
  @IsString()
  @IsOptional()
  ePhotoCode?: string;

  // Documents fournis (checkboxes admin)
  @IsBoolean()
  @IsOptional()
  hasIdCard?: boolean = false;

  @IsBoolean()
  @IsOptional()
  hasProofOfAddress?: boolean = false;

  @IsBoolean()
  @IsOptional()
  hasAssr2?: boolean = false;

  @IsBoolean()
  @IsOptional()
  hasJdcCertificate?: boolean = false;

  @IsBoolean()
  @IsOptional()
  hasCensusCertificate?: boolean = false;

  @IsBoolean()
  @IsOptional()
  needsMedicalOpinion?: boolean = false;

  @IsBoolean()
  @IsOptional()
  hasMedicalOpinion?: boolean = false;

  // ========== D. FORMATION ==========

  /**
   * Type de permis visé
   * @example "B"
   */
  @IsEnum(LicenseType)
  @IsOptional()
  licenseType?: LicenseType = LicenseType.B;

  /**
   * Statut administratif de l'élève
   * @example "PROSPECT"
   */
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus = StudentStatus.PROSPECT;

  /**
   * Heures achetées (en minutes)
   * Par défaut 0, modifiable ensuite
   * @example 1200 (= 20 heures)
   */
  @IsInt()
  @Min(0)
  @IsOptional()
  minutesPurchased?: number = 0;

  // ========== E. REPRÉSENTANT LÉGAL (Si Mineur) ==========

  /**
   * Nom du représentant légal
   * @example "Jean DUPONT"
   */
  @IsString()
  @IsOptional()
  guardianName?: string;

  /**
   * Téléphone du représentant légal
   * @example "0612345678"
   */
  @IsPhoneNumber('FR')
  @IsOptional()
  guardianPhone?: string;

  /**
   * Email du représentant légal
   * @example "jean.dupont@example.com"
   */
  @IsEmail()
  @IsOptional()
  guardianEmail?: string;

  /**
   * Relation avec l'élève
   * @example "Père", "Mère", "Tuteur"
   */
  @IsString()
  @IsOptional()
  guardianRelation?: string;
}
