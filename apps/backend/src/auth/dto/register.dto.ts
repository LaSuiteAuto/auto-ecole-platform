import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO pour l'inscription d'une nouvelle auto-école avec son administrateur
 *
 * Crée simultanément :
 * - Un tenant (auto-école)
 * - Un utilisateur admin pour ce tenant
 */
export class RegisterDto {
  /**
   * Nom de l'auto-école
   * @example "Auto École Demo"
   */
  @IsString()
  @IsNotEmpty()
  tenantName: string;

  /**
   * Email de l'administrateur
   * Doit être unique dans la base de données
   * @example "admin@demo.fr"
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * Mot de passe de l'administrateur
   * Sera hashé avec bcrypt avant stockage
   * Minimum 8 caractères pour sécurité
   * @example "Password123!"
   */
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  password: string;
}
