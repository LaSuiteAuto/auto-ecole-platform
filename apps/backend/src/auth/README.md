# 🔐 Module d'Authentification

Système d'authentification complet avec JWT pour la plateforme Auto-École.

## 📋 Fonctionnalités

### ✅ Implémenté (Sprint 1)

- ✅ **Register** : Inscription nouvelle auto-école avec admin
- ✅ **Login** : Connexion utilisateur avec JWT
- ✅ **Me** : Récupération profil utilisateur connecté
- ✅ **Logout** : Déconnexion côté client (suppression token)
- ✅ Validation des DTOs (class-validator)
- ✅ Hashage des mots de passe (bcrypt)
- ✅ Protection des routes (JWT Guard)
- ✅ Multi-tenant (isolation par tenantId)

### 🚧 À venir (Sprint 2+)

- ⏳ Reset password avec email
- ⏳ Refresh tokens
- ⏳ Blacklist JWT (Redis)
- ⏳ Rate limiting
- ⏳ 2FA (optionnel)
- ⏳ OAuth (Google, etc.)

---

## 🏗️ Architecture

```
src/auth/
├── auth.module.ts           # Configuration du module
├── auth.controller.ts       # Endpoints HTTP
├── auth.service.ts          # Logique métier
├── dto/                     # Validation des entrées
│   ├── register.dto.ts
│   ├── login.dto.ts
│   └── index.ts
├── strategies/              # Stratégies Passport
│   └── jwt.strategy.ts
├── guards/                  # Protection des routes
│   └── jwt-auth.guard.ts
└── decorators/              # Décorateurs personnalisés
    └── current-user.decorator.ts
```

---

## 🔑 Endpoints

### POST /auth/register

Inscription d'une nouvelle auto-école.

**Body :**
```json
{
  "tenantName": "Auto École Demo",
  "email": "admin@demo.fr",
  "password": "Password123!"
}
```

**Response :**
```json
{
  "access_token": "eyJhbG...",
  "user": {
    "id": "...",
    "email": "admin@demo.fr",
    "role": "ADMIN",
    "tenantId": "..."
  }
}
```

### POST /auth/login

Connexion utilisateur existant.

**Body :**
```json
{
  "email": "admin@demo.fr",
  "password": "Password123!"
}
```

**Response :** Identique à /register

### GET /auth/me

Profil utilisateur connecté (nécessite JWT).

**Headers :**
```
Authorization: Bearer <token>
```

**Response :**
```json
{
  "id": "...",
  "email": "admin@demo.fr",
  "role": "ADMIN",
  "tenantId": "...",
  "createdAt": "2026-01-13T..."
}
```

---

## 🔒 Sécurité

### Mots de passe

- **Hashage** : bcrypt avec 10 rounds
- **Validation** : Minimum 8 caractères
- **Stockage** : Jamais en clair, jamais retournés dans les réponses

### JWT

- **Algorithm** : HS256
- **Secret** : `process.env.JWT_SECRET`
- **Expiration** : 7 jours
- **Payload** :
  ```json
  {
    "sub": "userId",
    "tenantId": "...",
    "role": "ADMIN",
    "iat": 1234567890,
    "exp": 1234567890
  }
  ```

### Validation

- **DTOs** : class-validator automatique
- **Whitelist** : Propriétés inconnues rejetées
- **Transform** : Types convertis automatiquement

### CORS

- Activé pour le frontend
- Configurable via `FRONTEND_URL`

---

## 🛠️ Utilisation

### Dans un Controller

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';

@Controller('students')
export class StudentsController {
  
  // Route protégée
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser('userId') userId: string) {
    // L'utilisateur est authentifié
    return this.studentsService.findAll(userId);
  }
  
  // Récupérer tout l'utilisateur
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: CurrentUserData) {
    // user contient : userId, email, tenantId, role
    return user;
  }
}
```

### Dans un Service

```typescript
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}
  
  // Toujours filtrer par tenantId (multi-tenant)
  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    return this.prisma.student.findMany({
      where: { tenantId: user.tenantId }, // IMPORTANT !
    });
  }
}
```

---

## 🧪 Tests

### Tests Manuels

Voir [TESTS-API.md](../../docs/TESTS-API.md) pour les scripts PowerShell.

### Tests Automatisés

```bash
# Dans le conteneur
docker exec -it autoecole-backend npm test

# Localement
cd apps/backend
npm test
```

**Exemple de test :**

```typescript
describe('AuthController', () => {
  it('should register a new tenant and admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        tenantName: 'Test Auto École',
        email: 'test@test.fr',
        password: 'Password123!',
      })
      .expect(201);

    expect(response.body).toHaveProperty('access_token');
    expect(response.body.user.role).toBe('ADMIN');
  });
});
```

---

## 🔧 Configuration

### Variables d'environnement

```env
# Base de données
DATABASE_URL="postgresql://autoecole:autoecole@db:5432/autoecole"

# JWT
JWT_SECRET="dev-secret-change-in-production"

# Frontend
FRONTEND_URL="http://localhost:3001"

# Node
NODE_ENV="development"
PORT="3000"
```

⚠️ **IMPORTANT** : Changer `JWT_SECRET` en production !

### Installation

```bash
# Dans le conteneur
docker exec -it autoecole-backend npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer

# Types
docker exec -it autoecole-backend npm install -D @types/passport-jwt @types/bcrypt
```

---

## 📚 Documentation

- [API-AUTH.md](../../docs/API-AUTH.md) - Documentation complète des endpoints
- [TESTS-API.md](../../docs/TESTS-API.md) - Guide de tests
- [NestJS Auth](https://docs.nestjs.com/security/authentication) - Documentation officielle
- [JWT.io](https://jwt.io/) - Debugger JWT

---

## 🐛 Troubleshooting

### Erreur "Unauthorized"

1. Vérifier que le token est dans le header `Authorization: Bearer <token>`
2. Vérifier que le token n'est pas expiré (7 jours)
3. Vérifier `JWT_SECRET` dans `.env`

### Erreur "Email déjà utilisé"

L'email est unique. Utiliser un autre email ou supprimer l'utilisateur existant :

```bash
docker exec -it autoecole-backend npx prisma studio
```

### Backend ne démarre pas

```bash
# Voir les logs
docker compose logs backend

# Regénérer Prisma Client
docker exec -it autoecole-backend npx prisma generate

# Relancer les migrations
docker exec -it autoecole-backend npx prisma migrate dev
```

---

## 🚀 Prochaines étapes

1. **Frontend** : Intégrer l'authentification dans Next.js
2. **Tests E2E** : Ajouter des tests automatisés complets
3. **Rate Limiting** : Protéger contre les attaques brute force
4. **Refresh Tokens** : Améliorer la sécurité JWT
5. **Reset Password** : Implémenter l'envoi d'emails

---

## 👥 Contribution

Lors de l'ajout de nouvelles fonctionnalités :

1. ✅ Créer un DTO pour la validation
2. ✅ Ajouter la logique dans le service
3. ✅ Créer le endpoint dans le controller
4. ✅ Documenter dans API-AUTH.md
5. ✅ Ajouter des tests
6. ✅ Bien commenter le code

---

**Fait avec ❤️ pour l'équipe Auto-École Platform**
