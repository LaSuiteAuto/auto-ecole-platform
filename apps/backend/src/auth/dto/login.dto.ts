import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO pour la connexion d'un utilisateur existant
 */
export class LoginDto {
  /**
   * Email de l'utilisateur
   * @example "admin@demo.fr"
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * Mot de passe de l'utilisateur
   * @example "Password123!"
   */
  @IsString()
  @IsNotEmpty()
  password: string;
}
