# 📊 Système de Journalisation (Logging & Audit)

## 🎯 Vue d'ensemble

Système de journalisation à deux niveaux pour traçabilité complète :

1. **Logging technique** : Toutes les requêtes HTTP (stdout)
2. **Audit log métier** : Actions critiques (base de données)

---

## 🔍 Niveau 1 : Logging Technique (HTTP)

### Fonctionnement

Interceptor global qui logge **toutes les requêtes HTTP** en JSON structuré.

**Fichier** : [request-logging.interceptor.ts](../apps/backend/src/shared/interceptors/request-logging.interceptor.ts)

### Données loggées

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "url": "/api/students",
  "statusCode": 201,
  "duration": 145,
  "userId": "user-123",
  "tenantId": "tenant-abc",
  "type": "response",
  "timestamp": "2026-01-22T10:30:00.000Z"
}
```

### Champs

| Champ | Description |
|-------|-------------|
| `requestId` | UUID unique pour traçabilité (permet de lier request/response) |
| `method` | Méthode HTTP (GET, POST, PUT, DELETE, etc.) |
| `url` | URL complète de la requête |
| `statusCode` | Code de réponse HTTP (200, 404, 500, etc.) |
| `duration` | Durée en millisecondes |
| `userId` | ID utilisateur (null si non authentifié) |
| `tenantId` | ID du tenant (null si non authentifié) |
| `type` | `request`, `response`, ou `error` |
| `timestamp` | Date/heure ISO 8601 |

### Configuration

Activé automatiquement via `APP_INTERCEPTOR` dans [app.module.ts](../apps/backend/src/app.module.ts) :

```typescript
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

### Exemples de logs

#### Requête publique (login)

```json
// Request
{
  "requestId": "abc-123",
  "method": "POST",
  "url": "/auth/login",
  "userId": null,
  "tenantId": null,
  "type": "request"
}

// Response
{
  "requestId": "abc-123",
  "method": "POST",
  "url": "/auth/login",
  "statusCode": 200,
  "duration": 245,
  "userId": null,
  "tenantId": null,
  "type": "response",
  "timestamp": "2026-01-22T10:30:00.000Z"
}
```

#### Requête authentifiée

```json
{
  "requestId": "def-456",
  "method": "GET",
  "url": "/api/students",
  "statusCode": 200,
  "duration": 35,
  "userId": "user-789",
  "tenantId": "tenant-abc",
  "type": "response",
  "timestamp": "2026-01-22T10:31:00.000Z"
}
```

#### Erreur

```json
{
  "requestId": "ghi-789",
  "method": "DELETE",
  "url": "/api/students/invalid-id",
  "statusCode": 404,
  "duration": 12,
  "userId": "user-789",
  "tenantId": "tenant-abc",
  "error": "Student not found",
  "type": "error",
  "timestamp": "2026-01-22T10:32:00.000Z"
}
```

### Utilisation du requestId

Le `requestId` est ajouté à l'objet `request` et peut être utilisé dans les logs applicatifs :

```typescript
async createStudent(@Req() req: Request, @Body() dto: CreateStudentDto) {
  this.logger.log(`Creating student`, { requestId: req.requestId });
  // ...
}
```

---

## 🗃️ Niveau 2 : Audit Log Métier

### Principe

**Logs en base de données** uniquement pour les **actions critiques métier**.

**Fichier service** : [audit.service.ts](../apps/backend/src/audit/audit.service.ts)  
**Modèle Prisma** : [schema.prisma](../apps/backend/prisma/schema.prisma)

### Actions critiques loggées

| Action | Description | Exemple metadata |
|--------|-------------|------------------|
| `LESSON_CANCELLED` | Annulation de séance | `{ reason: "Student sick", cancelledBy: "ADMIN" }` |
| `LESSON_UPDATED` | Modification de séance | `{ before: {...}, after: {...} }` |
| `STUDENT_HOURS_UPDATED` | Changement heures restantes | `{ before: 20, after: 15, reason: "Lesson consumed" }` |
| `STUDENT_ARCHIVED` | Archivage d'élève | `{ reason: "Finished training" }` |
| `INSTRUCTOR_CREATED` | Création moniteur | `{ instructorId: "...", name: "..." }` |
| `INSTRUCTOR_DELETED` | Suppression moniteur | `{ reason: "Left company" }` |
| `USER_ROLE_CHANGED` | Changement de rôle | `{ before: "SECRETARY", after: "ADMIN" }` |
| `DATA_EXPORTED` | Export de données | `{ entityType: "Student", count: 150 }` |

### Modèle de données

```prisma
model AuditLog {
  id           String   @id @default(uuid())
  tenantId     String
  actorUserId  String   // Qui a fait l'action
  action       String   // Ex: "LESSON_CANCELLED"
  entityType   String   // Ex: "Student", "Lesson"
  entityId     String   // ID de l'entité concernée
  metadata     Json?    // Données avant/après, détails
  createdAt    DateTime @default(now())

  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  actor        User     @relation(fields: [actorUserId], references: [id])

  @@index([tenantId])
  @@index([actorUserId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### Utilisation

#### Enregistrer un log d'audit

```typescript
import { AuditService, AuditAction } from './audit';

@Injectable()
export class LessonsService {
  constructor(private auditService: AuditService) {}

  async cancelLesson(
    lessonId: string,
    userId: string,
    tenantId: string,
    reason: string,
  ) {
    // 1. Effectuer l'action métier
    const lesson = await this.prisma.lesson.update({
      where: { id: lessonId, tenantId },
      data: { status: 'CANCELLED' },
    });

    // 2. Logger dans l'audit log
    await this.auditService.log({
      tenantId,
      actorUserId: userId,
      action: AuditAction.LESSON_CANCELLED,
      entityType: 'Lesson',
      entityId: lessonId,
      metadata: {
        reason,
        studentId: lesson.studentId,
        originalDate: lesson.scheduledAt,
      },
    });

    return lesson;
  }
}
```

#### Récupérer les logs

```typescript
// Tous les logs d'un tenant (100 derniers)
const logs = await auditService.getLogs(tenantId);

// Tous les logs d'un tenant (limite personnalisée)
const logs = await auditService.getLogs(tenantId, 50);

// Logs pour une entité spécifique
const logs = await auditService.getLogsForEntity(
  tenantId,
  'Student',
  studentId,
);

// Logs d'un utilisateur
const logs = await auditService.getLogsForUser(tenantId, userId);
```

### Enum des actions

**Fichier** : [audit-action.enum.ts](../apps/backend/src/audit/enums/audit-action.enum.ts)

```typescript
export enum AuditAction {
  // Séances
  LESSON_CREATED = 'LESSON_CREATED',
  LESSON_UPDATED = 'LESSON_UPDATED',
  LESSON_CANCELLED = 'LESSON_CANCELLED',
  LESSON_DELETED = 'LESSON_DELETED',

  // Élèves
  STUDENT_CREATED = 'STUDENT_CREATED',
  STUDENT_UPDATED = 'STUDENT_UPDATED',
  STUDENT_ARCHIVED = 'STUDENT_ARCHIVED',
  STUDENT_DELETED = 'STUDENT_DELETED',
  STUDENT_HOURS_UPDATED = 'STUDENT_HOURS_UPDATED',

  // Moniteurs
  INSTRUCTOR_CREATED = 'INSTRUCTOR_CREATED',
  INSTRUCTOR_UPDATED = 'INSTRUCTOR_UPDATED',
  INSTRUCTOR_DELETED = 'INSTRUCTOR_DELETED',

  // Rôles
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_CREATED = 'USER_CREATED',
  USER_DELETED = 'USER_DELETED',

  // Export
  DATA_EXPORTED = 'DATA_EXPORTED',
}
```

---

## 📋 Checklist d'implémentation

### Pour chaque action critique :

- [ ] Identifier si l'action est critique (voir liste ci-dessus)
- [ ] Utiliser `AuditService.log()` **après** l'action métier réussie
- [ ] Utiliser les constantes de `AuditAction` enum
- [ ] Inclure `tenantId` et `actorUserId`
- [ ] Fournir des `metadata` pertinentes (avant/après, raison, etc.)

### Exemple complet

```typescript
async updateStudentHours(
  studentId: string,
  newHours: number,
  userId: string,
  tenantId: string,
) {
  // 1. Récupérer l'état actuel
  const student = await this.prisma.student.findUnique({
    where: { id: studentId, tenantId },
  });

  if (!student) {
    throw new NotFoundException('Student not found');
  }

  const oldHours = student.remainingHours;

  // 2. Effectuer la modification
  const updated = await this.prisma.student.update({
    where: { id: studentId, tenantId },
    data: { remainingHours: newHours },
  });

  // 3. Logger l'audit
  await this.auditService.log({
    tenantId,
    actorUserId: userId,
    action: AuditAction.STUDENT_HOURS_UPDATED,
    entityType: 'Student',
    entityId: studentId,
    metadata: {
      before: oldHours,
      after: newHours,
      difference: newHours - oldHours,
    },
  });

  return updated;
}
```

---

## 🛡️ Sécurité et isolation

### Multi-tenant

Tous les logs d'audit sont **filtrés par tenantId** :

```typescript
// ✅ CORRECT : Filtrage par tenant
const logs = await auditService.getLogs(tenantId);

// ❌ INTERDIT : Pas de méthode sans tenantId
// (n'existe pas dans le service)
```

### Résilience

Si le log d'audit échoue, **l'action métier continue** :

```typescript
async log(data: AuditLogData): Promise<void> {
  try {
    await this.prisma.auditLog.create({ ... });
  } catch (error) {
    // Log l'erreur en stdout mais ne throw pas
    this.logger.error(`Failed to create audit log: ${error.message}`);
  }
}
```

**Principe** : Un échec de journalisation ne doit **jamais** bloquer l'utilisateur.

---

## 📊 Monitoring et analyse

### Logs techniques (stdout)

- Consultables via logs Docker / Kubernetes
- Analysables avec outils de monitoring (Datadog, ELK, etc.)
- Format JSON pour parsing automatique

### Logs d'audit (base de données)

- Consultables via l'application (interface admin future)
- Exportables pour audit externe
- Traçabilité complète : qui, quoi, quand

### Exemples de requêtes SQL

```sql
-- Les 10 dernières actions d'un utilisateur
SELECT * FROM "AuditLog"
WHERE "tenantId" = 'tenant-abc'
  AND "actorUserId" = 'user-123'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Toutes les annulations de séances du mois
SELECT * FROM "AuditLog"
WHERE "tenantId" = 'tenant-abc'
  AND "action" = 'LESSON_CANCELLED'
  AND "createdAt" >= '2026-01-01'
  AND "createdAt" < '2026-02-01'
ORDER BY "createdAt" DESC;

-- Historique complet d'un élève
SELECT * FROM "AuditLog"
WHERE "tenantId" = 'tenant-abc'
  AND "entityType" = 'Student'
  AND "entityId" = 'student-789'
ORDER BY "createdAt" ASC;
```

---

## 🧪 Tests

### Tests unitaires

- **AuditService** : 9 tests
- **RequestLoggingInterceptor** : 7 tests

**Total** : 16 tests ✅

Fichiers :
- [audit.service.spec.ts](../apps/backend/src/audit/audit.service.spec.ts)
- [request-logging.interceptor.spec.ts](../apps/backend/src/shared/interceptors/request-logging.interceptor.spec.ts)

---

## 📚 Documentation liée

- [team-rules.md](./team-rules.md) - Règles de l'équipe
- [MULTI-TENANT.md](./MULTI-TENANT.md) - Isolation des données

---

## 🎯 Résumé

### Règles d'or

1. **Logging technique** : Automatique, toutes les requêtes, stdout
2. **Audit métier** : Manuel, actions critiques uniquement, base de données
3. **Multi-tenant** : Toujours filtrer par `tenantId`
4. **Résilience** : Les logs ne doivent jamais bloquer l'app
5. **Metadata** : Inclure les données avant/après pour traçabilité

### Quand utiliser l'audit log ?

✅ **OUI** :
- Modification de données sensibles (heures, rôles, etc.)
- Suppressions (moniteurs, séances, élèves)
- Actions administratives (exports, archivages)
- Changements de permissions

❌ **NON** :
- Consultations simples (GET)
- Logs techniques (déjà gérés par l'interceptor)
- Actions non-critiques

**En cas de doute** : Demander en code review. 🔍
