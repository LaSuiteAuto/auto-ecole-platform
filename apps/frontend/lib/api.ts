import axios from 'axios';

/**
 * Instance Axios configurée pour l'API backend
 *
 * Configuration :
 * - baseURL : URL du backend (env var ou localhost:3000)
 * - timeout : 10 secondes
 * - headers : JSON par défaut
 * - withCredentials : Pour les cookies (futurs)
 *
 * Intercepteurs :
 * - Request : Ajoute le token JWT depuis localStorage
 * - Response : Gestion automatique des erreurs
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Intercepteur de requête
 * Ajoute le token JWT à chaque requête si disponible
 */
api.interceptors.request.use(
  (config) => {
    // Récupérer le token depuis localStorage
    const token = localStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Intercepteur de réponse
 * Gestion automatique des erreurs et du logout
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 Unauthorized → Déconnexion automatique
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Retourner l'erreur pour gestion dans les composants
    return Promise.reject(error);
  }
);

export default api;

/**
 * Types pour les réponses API
 */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  requestId?: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'SECRETARY' | 'INSTRUCTOR' | 'STUDENT';
  tenantId: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

/**
 * API Auth
 */
export const authApi = {
  /**
   * Inscription (création tenant + admin)
   */
  register: async (data: {
    tenantName: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Connexion
   */
  login: async (data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Récupérer l'utilisateur connecté
   */
  me: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};
