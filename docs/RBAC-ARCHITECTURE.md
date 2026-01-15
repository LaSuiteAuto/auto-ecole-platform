# 🔐 Système RBAC - Architecture

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                        │
│                     Bearer <JWT_TOKEN>                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    1. JwtAuthGuard                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • Vérifie le token JWT                              │    │
│  │ • Décode le payload: { sub, tenantId, role }       │    │
│  │ • Appelle JwtStrategy.validate()                    │    │
│  │ • Charge req.user depuis la DB                      │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ req.user = { userId, email, tenantId, role }
                        │
┌─────────────────────────────────────────────────────────────┐
│                    2. RolesGuard                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • Récupère @Roles(...) depuis les métadonnées     │    │
│  │ • Si pas de @Roles → autorise                      │    │
│  │ • Sinon : vérifie req.user.role ∈ @Roles(...)     │    │
│  │ • Retourne true/false                               │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ Authorization OK
                        │
┌─────────────────────────────────────────────────────────────┐
│                   CONTROLLER METHOD                         │
│         @CurrentUser() injecte req.user                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Structure des Fichiers

```
apps/backend/src/
│
├── 📁 shared/                        # Code partagé
│   ├── 📁 enums/
│   │   └── 📄 role.enum.ts           # Enum: ADMIN, SECRETARY, INSTRUCTOR, STUDENT
│   └── 📄 index.ts                   # Export centralisé
│
├── 📁 auth/                          # Module authentification
│   ├── 📁 guards/
│   │   ├── 📄 jwt-auth.guard.ts     # Vérifie le JWT
│   │   ├── 📄 roles.guard.ts        # Vérifie les rôles (RBAC)
│   │   └── 📄 index.ts              # Export centralisé
│   │
│   ├── 📁 decorators/
│   │   ├── 📄 current-user.decorator.ts  # @CurrentUser() pour extraire req.user
│   │   ├── 📄 roles.decorator.ts         # @Roles(...) pour définir rôles requis
│   │   └── 📄 index.ts                   # Export centralisé
│   │
│   ├── 📁 strategies/
│   │   └── 📄 jwt.strategy.ts       # Stratégie Passport JWT
│   │
│   ├── 📄 auth.service.ts           # Logique métier (register, login, validate)
│   ├── 📄 auth.controller.ts        # Routes HTTP + exemples RBAC
│   └── 📄 auth.module.ts            # Configuration du module
│
└── 📁 prisma/
    └── 📄 schema.prisma             # Enum UserRole en DB
```

---

## 🔄 Flow de Requête

### Exemple : POST /students (création d'élève)

```typescript
// Controller
@Controller('students')
export class StudentsController {
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)  // ← Guards appliqués
  @Roles(Role.ADMIN, Role.SECRETARY)    // ← Rôles autorisés
  async create(@Body() dto: CreateStudentDto, @CurrentUser() user: CurrentUserData) {
    return this.studentsService.create(dto, user.tenantId);
  }
}
```

#### Étapes :

1. **Requête HTTP**
   ```http
   POST /students
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Content-Type: application/json
   
   { "name": "Jean Dupont", "email": "jean@example.com" }
   ```

2. **JwtAuthGuard**
   - Extrait le token du header `Authorization`
   - Vérifie la signature JWT
   - Décode : `{ sub: "uuid-123", tenantId: "uuid-456", role: "ADMIN" }`
   - Appelle `JwtStrategy.validate(payload)`
   - Charge l'utilisateur depuis la DB
   - Injecte dans `req.user`

3. **RolesGuard**
   - Lit les métadonnées : `@Roles(Role.ADMIN, Role.SECRETARY)`
   - Récupère `req.user.role` → `"ADMIN"`
   - Vérifie : `"ADMIN" ∈ [ADMIN, SECRETARY]` → ✅ true
   - Autorise la requête

4. **Controller Method**
   - `@CurrentUser()` injecte `req.user`
   - Méthode `create()` s'exécute
   - Service crée l'élève avec `user.tenantId` (isolation multi-tenant)

5. **Réponse**
   ```json
   {
     "id": "uuid-789",
     "name": "Jean Dupont",
     "email": "jean@example.com",
     "tenantId": "uuid-456"
   }
   ```

---

## 🎭 Cas d'Usage par Rôle

### ADMIN
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
async deleteUser(@Param('id') id: string) {
  // Seul ADMIN peut supprimer
}
```

### ADMIN OU SECRETARY
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SECRETARY)
async createStudent(@Body() dto: CreateStudentDto) {
  // ADMIN ou SECRETARY peuvent créer
}
```

### Tous les Authentifiés (pas de @Roles)
```typescript
@UseGuards(JwtAuthGuard)
async getPlanning() {
  // Tous les utilisateurs authentifiés
  // ADMIN, SECRETARY, INSTRUCTOR, STUDENT
}
```

### Public (pas de guards)
```typescript
@Post('register')
async register(@Body() dto: RegisterDto) {
  // Accessible sans authentification
}
```

---

## 🔑 JWT Payload

```typescript
{
  sub: "user-uuid",           // ID utilisateur (subject)
  tenantId: "tenant-uuid",    // ID auto-école (multi-tenant)
  role: "ADMIN",              // Rôle (ADMIN, SECRETARY, INSTRUCTOR, STUDENT)
  iat: 1705147200,            // Issued at (timestamp)
  exp: 1705752000             // Expiration (timestamp)
}
```

---

## 🛡️ Sécurité

### ✅ Ce qui est sécurisé

- JWT vérifié avec signature HS256
- Mot de passe hashé avec bcrypt (10 rounds)
- Validation automatique des DTOs (class-validator)
- Isolation multi-tenant (tenantId)
- RBAC avec vérification de rôle

### ⚠️ À améliorer (Sprint 2+)

- [ ] Refresh tokens
- [ ] Blacklist JWT (Redis)
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] Helmet (headers HTTP sécurisés)

---

## 🧪 Tests

### Matrice des Permissions

| Route | ADMIN | SECRETARY | INSTRUCTOR | STUDENT | Public |
|-------|-------|-----------|------------|---------|--------|
| POST /auth/register | - | - | - | - | ✅ |
| POST /auth/login | - | - | - | - | ✅ |
| GET /auth/me | ✅ | ✅ | ✅ | ✅ | ❌ |
| GET /auth/admin-only | ✅ | ❌ | ❌ | ❌ | ❌ |
| GET /auth/admin-or-secretary | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /students | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /planning | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 📖 Documentation

- [RBAC.md](./RBAC.md) - Guide complet
- [TESTS-RBAC.md](./TESTS-RBAC.md) - Tests manuels
- [RBAC-RECAP.md](./RBAC-RECAP.md) - Récapitulatif

---

## 🎯 Checklist d'Implémentation

### Pour chaque nouveau endpoint :

1. **Déterminer les permissions**
   - Qui peut accéder ? (ADMIN, SECRETARY, etc.)
   - Public ou authentifié ?

2. **Appliquer les guards**
   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard)  // Dans cet ordre !
   @Roles(Role.ADMIN, Role.SECRETARY)     // Optionnel
   ```

3. **Utiliser @CurrentUser()**
   ```typescript
   async method(@CurrentUser() user: CurrentUserData) {
     // user.userId, user.tenantId, user.role
   }
   ```

4. **Filtrer par tenantId**
   ```typescript
   // TOUJOURS filtrer par tenant pour multi-tenant
   return this.service.findAll({ tenantId: user.tenantId });
   ```

---

## 🚀 Prêt à l'Emploi

Le système RBAC est **100% fonctionnel** et **prêt à être utilisé** sur tous vos nouveaux endpoints !

**Next Step** : Créer les modules students, sessions, instructors avec RBAC appliqué.
