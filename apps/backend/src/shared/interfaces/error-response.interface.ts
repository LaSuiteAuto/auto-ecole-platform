/**
 * Interface pour le format d'erreur standardisé
 *
 * Format cohérent pour toutes les erreurs de l'API :
 * - statusCode : Code HTTP (400, 404, 500, etc.)
 * - error : Nom de l'erreur (Bad Request, Not Found, etc.)
 * - message : Message descriptif (string ou array)
 * - path : URL de la requête qui a échoué
 * - requestId : ID unique de la requête (pour traçabilité)
 * - timestamp : Date/heure ISO de l'erreur
 */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  requestId?: string;
  timestamp: string;
}
