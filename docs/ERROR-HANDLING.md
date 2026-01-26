# 🛡️ Gestion Globale des Erreurs

## 🎯 Vue d'ensemble

Système de gestion centralisée des erreurs pour garantir :
- **Format cohérent** : Toutes les erreurs suivent la même structure
- **Messages clairs** : Erreurs lisibles pour le frontend
- **Sécurité** : Pas de fuite d'informations en production
- **Traçabilité** : RequestId inclus dans chaque erreur
- **Support** : Logs détaillés pour debug

---

## 📋 Format d'erreur standardisé

### Structure

```typescript
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  requestId?: string;
  timestamp: string;
}
```

### Exemples

#### Erreur de validation (400)

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "Email must be a valid email",
    "Password must be at least 8 characters"
  ],
  "path": "/auth/register",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-01-22T10:00:00.000Z"
}
```

#### Email déjà utilisé (409)

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Email already used",
  "path": "/auth/register",
  "requestId": "abc-123",
  "timestamp": "2026-01-22T10:05:00.000Z"
}
```

#### Ressource non trouvée (404)

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Resource not found",
  "path": "/api/students/invalid-id",
  "requestId": "def-456",
  "timestamp": "2026-01-22T10:10:00.000Z"
}
```

#### Erreur serveur (500)

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Internal server error",
  "path": "/api/students",
  "requestId": "ghi-789",
  "timestamp": "2026-01-22T10:15:00.000Z"
}
```

---

## 🔧 Composants

### 1. AllExceptionsFilter

**Fichier** : [all-exceptions.filter.ts](../apps/backend/src/shared/filters/all-exceptions.filter.ts)

**Rôle** : Catch **toutes** les exceptions (HTTP et génériques)

**Fonctionnalités** :
- Formatte toutes les erreurs en `ErrorResponse`
- Masque les détails techniques en production
- Logue les erreurs avec stack trace en développement
- Inclut le `requestId` pour traçabilité

**Exemples** :

```typescript
// HttpException (NestJS)
throw new BadRequestException('Invalid email');
// → 400 { message: 'Invalid email', ... }

// Error générique
throw new Error('Database connection failed');
// → 500 { message: 'Internal server error', ... } (masqué en prod)
```

### 2. PrismaExceptionFilter

**Fichier** : [prisma-exception.filter.ts](../apps/backend/src/shared/filters/prisma-exception.filter.ts)

**Rôle** : Convertit les erreurs Prisma en erreurs HTTP lisibles

**Mapping des erreurs** :

| Code Prisma | Signification | HTTP Status | Message |
|-------------|---------------|-------------|---------|
| `P2002` | Unique constraint violation | 409 Conflict | "Email already used" |
| `P2025` | Record not found | 404 Not Found | "Resource not found" |
| `P2003` | Foreign key constraint | 400 Bad Request | "Invalid reference: tenantId" |
| `P2014` | Required relation violation | 400 Bad Request | "Invalid relation data" |
| Autres | Erreur inconnue | 500 Internal Server Error | "Database error" (prod) |

**Exemples** :

```typescript
// Tentative de créer un user avec email existant
await prisma.user.create({
  data: { email: 'existing@test.fr', ... }
});
// → Prisma lance P2002
// → PrismaExceptionFilter retourne :
// {
//   "statusCode": 409,
//   "error": "Conflict",
//   "message": "Email already used",
//   ...
// }

// Tentative d'update d'un user inexistant
await prisma.user.update({
  where: { id: 'invalid-id' },
  data: { ... }
});
// → Prisma lance P2025
// → PrismaExceptionFilter retourne :
// {
//   "statusCode": 404,
//   "error": "Not Found",
//   "message": "Resource not found",
//   ...
// }
```

---

## ⚙️ Configuration

### main.ts

```typescript
import {
  AllExceptionsFilter,
  PrismaExceptionFilter,
} from './shared/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // IMPORTANT : Ordre des filtres
  // PrismaExceptionFilter AVANT AllExceptionsFilter
  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new AllExceptionsFilter(),
  );

  // ...
}
```

**Pourquoi cet ordre ?**
1. `PrismaExceptionFilter` catch uniquement les erreurs Prisma
2. `AllExceptionsFilter` catch toutes les autres erreurs
3. Si inversé, `AllExceptionsFilter` catch tout et `PrismaExceptionFilter` ne reçoit rien

---

## 🎯 Utilisation dans le code

### Lancer des erreurs HTTP

```typescript
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

// 400 Bad Request
throw new BadRequestException('Invalid input');

// 404 Not Found
throw new NotFoundException('Student not found');

// 409 Conflict
throw new ConflictException('Email already used');

// 401 Unauthorized
throw new UnauthorizedException('Invalid credentials');

// 403 Forbidden
throw new ForbiddenException('Access denied');
```

### Erreurs Prisma (automatiques)

```typescript
// Ces erreurs sont automatiquement converties
try {
  await this.prisma.user.create({
    data: { email: 'duplicate@test.fr', ... }
  });
} catch (error) {
  // PrismaExceptionFilter intercepte et convertit en 409
  throw error;
}

// Pas besoin de try/catch si vous voulez juste laisser
// le filtre gérer l'erreur
await this.prisma.student.update({
  where: { id: studentId, tenantId },
  data: { ... }
});
// → Si inexistant, retourne automatiquement 404
```

---

## 🔒 Sécurité

### Production vs Développement

**En développement** :
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Cannot connect to database: Connection refused",
  "path": "/api/students",
  "timestamp": "..."
}
```

**En production** :
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Internal server error",
  "path": "/api/students",
  "timestamp": "..."
}
```

### Stack traces

**Jamais exposées** au client, mais loggées côté serveur :

```typescript
// Dans AllExceptionsFilter
this.logger.error(
  JSON.stringify({
    ...errorResponse,
    stack: process.env.NODE_ENV === 'development'
      ? exception.stack
      : undefined,
  }),
);
```

---

## 🧪 Tests

### Tests unitaires

- **AllExceptionsFilter** : 13 tests
- **PrismaExceptionFilter** : 11 tests

**Total** : 24 tests ✅

**Fichiers** :
- [all-exceptions.filter.spec.ts](../apps/backend/src/shared/filters/all-exceptions.filter.spec.ts)
- [prisma-exception.filter.spec.ts](../apps/backend/src/shared/filters/prisma-exception.filter.spec.ts)

### Exemples de tests

```typescript
it('devrait retourner 409 Conflict pour un email déjà utilisé', () => {
  const exception = new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`email`)',
    { code: 'P2002', meta: { target: ['email'] } }
  );

  filter.catch(exception, mockHost);

  expect(mockResponse.status).toHaveBeenCalledWith(409);
  expect(mockResponse.json).toHaveBeenCalledWith(
    expect.objectContaining({
      statusCode: 409,
      error: 'Conflict',
      message: 'Email already used',
    })
  );
});
```

---

## 📊 Traçabilité avec requestId

Chaque erreur inclut le `requestId` généré par [RequestLoggingInterceptor](../apps/backend/src/shared/interceptors/request-logging.interceptor.ts).

### Flux complet

1. **Requête entrante** → RequestLoggingInterceptor génère `requestId`
2. **Erreur survient** → ExceptionFilter inclut `requestId` dans la réponse
3. **Logs serveur** → `requestId` permet de tracer toute la requête

### Exemple

```json
// Log de la requête (stdout)
{
  "requestId": "abc-123",
  "method": "POST",
  "url": "/auth/register",
  "type": "request"
}

// Log de l'erreur (stdout)
{
  "requestId": "abc-123",
  "statusCode": 409,
  "error": "Conflict",
  "message": "Email already used",
  "type": "error"
}

// Réponse au client
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Email already used",
  "path": "/auth/register",
  "requestId": "abc-123",
  "timestamp": "2026-01-22T10:00:00Z"
}
```

**Avantage** : Avec le `requestId`, vous pouvez retrouver tous les logs liés à une requête spécifique.

---

## 🎨 Intégration frontend

### Afficher les erreurs

```typescript
// Axios interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorResponse = error.response?.data;
    
    // Format standard garanti
    const message = Array.isArray(errorResponse.message)
      ? errorResponse.message.join(', ')
      : errorResponse.message;
    
    // Afficher à l'utilisateur
    toast.error(message);
    
    // Logger pour debug avec requestId
    console.error('[API Error]', {
      requestId: errorResponse.requestId,
      status: errorResponse.statusCode,
      message: errorResponse.message,
    });
    
    return Promise.reject(error);
  }
);
```

### Exemple de composant React

```tsx
const handleRegister = async (data: RegisterDto) => {
  try {
    await api.post('/auth/register', data);
    toast.success('Account created!');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      
      // Gérer les erreurs de validation (array)
      if (Array.isArray(errorData.message)) {
        errorData.message.forEach(msg => toast.error(msg));
      } else {
        toast.error(errorData.message);
      }
    }
  }
};
```

---

## 📋 Checklist

### Pour chaque endpoint :

- [ ] Utiliser les exceptions HTTP appropriées (`NotFoundException`, `BadRequestException`, etc.)
- [ ] Ne pas exposer de détails techniques au client
- [ ] Laisser les filtres gérer les erreurs Prisma
- [ ] Vérifier que le `requestId` est présent dans les logs

### Erreurs courantes à éviter :

❌ **À éviter** :
```typescript
// Mauvais : message technique
throw new Error('Cannot execute query: Connection timeout');

// Mauvais : return au lieu de throw
return { error: 'Not found' };
```

✅ **Bon** :
```typescript
// Bon : exception HTTP avec message clair
throw new NotFoundException('Student not found');

// Bon : laisser Prisma throw et le filtre gérer
await prisma.student.findUniqueOrThrow({
  where: { id: studentId, tenantId }
});
```

---

## 🎯 Résumé

### Avantages

1. **DX/UX** : Messages d'erreur clairs et cohérents
2. **Sécurité** : Pas de fuite d'infos techniques en production
3. **Support** : Traçabilité avec `requestId`
4. **Maintenance** : Centralisation de la logique d'erreur

### Format garanti

Toutes les erreurs suivent ce format :

```typescript
{
  statusCode: number,
  error: string,
  message: string | string[],
  path: string,
  requestId?: string,
  timestamp: string
}
```

### Fichiers clés

- [all-exceptions.filter.ts](../apps/backend/src/shared/filters/all-exceptions.filter.ts)
- [prisma-exception.filter.ts](../apps/backend/src/shared/filters/prisma-exception.filter.ts)
- [error-response.interface.ts](../apps/backend/src/shared/interfaces/error-response.interface.ts)
- [main.ts](../apps/backend/src/main.ts)

---

## 📚 Documentation liée

- [LOGGING-AUDIT.md](./LOGGING-AUDIT.md) - Système de journalisation
- [team-rules.md](./team-rules.md) - Règles de l'équipe

**Le système de gestion d'erreurs est maintenant complet et opérationnel !** 🎉
