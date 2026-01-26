# Documentation Module Élèves (Students)

## Vue d'ensemble

Le module **Students** gère le cycle de vie complet des élèves d'une auto-école :
- Création de dossier élève (avec compte utilisateur associé)
- Consultation et recherche
- Modification des informations
- Archivage / Restauration
- Suppression définitive
- Gestion des heures de conduite (achat et consommation)

---

## Architecture

```
apps/backend/src/student/
├── dto/
│   ├── create-student.dto.ts    # Validation création
│   ├── update-student.dto.ts    # Validation modification
│   └── index.ts                 # Barrel export
├── student.controller.ts        # Routes HTTP
├── student.service.ts           # Logique métier
├── student.module.ts            # Module NestJS
├── student.controller.spec.ts   # Tests controller
├── student.service.spec.ts      # Tests service
└── index.ts                     # Barrel export
```

---

## Modèle de Données (Prisma)

```prisma
model Student {
  id        String   @id @default(uuid())
  
  // Liens techniques
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  // A. IDENTITÉ
  birthName    String
  firstName    String
  birthDate    DateTime
  birthCity    String
  birthZipCode String?
  birthCountry String   @default("FRANCE")

  // B. CONTACT
  address      String
  city         String
  zipCode      String
  phone        String

  // C. DOCUMENTS ANTS
  neph         String?  @unique
  ePhotoCode   String?
  hasIdCard           Boolean @default(false)
  hasProofOfAddress   Boolean @default(false)
  hasAssr2            Boolean @default(false)
  hasJdcCertificate   Boolean @default(false)
  hasCensusCertificate Boolean @default(false)
  needsMedicalOpinion Boolean @default(false)
  hasMedicalOpinion   Boolean @default(false)

  // D. FORMATION
  licenseType     LicenseType   @default(B)
  status          StudentStatus @default(PROSPECT)
  minutesPurchased  Int @default(0)
  minutesUsed       Int @default(0)

  // E. REPRÉSENTANT LÉGAL
  guardianName     String?
  guardianPhone    String?
  guardianEmail    String?
  guardianRelation String?

  // F. SYSTÈME
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  archivedAt    DateTime?

  @@index([tenantId])
  @@index([neph])
  @@index([birthName])
}

enum LicenseType {
  B       // Permis B Classique
  AAC     // Apprentissage Anticipé de la Conduite
  CS      // Conduite Supervisée
  A1      // Moto 125cc
  A2      // Moto
}

enum StudentStatus {
  PROSPECT        // Prospect, pas encore inscrit
  ANTS_PROCESSING // Dossier ANTS en cours
  ACTIVE          // Élève actif en formation
  EXAM_READY      // Prêt pour l'examen
  LICENSE_OBTAINED // Permis obtenu
  ARCHIVED        // Archivé
}
```

---

## API Endpoints

### Base URL
```
/students
```

### Sécurité
Toutes les routes sont protégées par :
- **JwtAuthGuard** : Authentification JWT requise
- **RolesGuard** : Rôles autorisés
- **Multi-tenant** : Isolation par `tenantId`

### Rôles autorisés
| Route | Rôles |
|-------|-------|
| Toutes sauf DELETE | `ADMIN`, `SECRETARY` |
| DELETE | `ADMIN` uniquement |

---

### 1. Créer un élève

```http
POST /students
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "marie.dupont@example.com",
  "password": "MotDePasse123!",
  "birthName": "DUPONT",
  "firstName": "Marie",
  "birthDate": "2000-05-15",
  "birthCity": "Paris",
  "birthZipCode": "75001",
  "birthCountry": "FRANCE",
  "address": "12 rue de la République",
  "city": "Lyon",
  "zipCode": "69001",
  "phone": "+33612345678",
  "licenseType": "B",
  "guardianName": "Jean DUPONT",
  "guardianPhone": "+33698765432",
  "guardianRelation": "Père"
}
```

**Réponse** : `201 Created`
```json
{
  "id": "uuid",
  "userId": "uuid",
  "tenantId": "uuid",
  "birthName": "DUPONT",
  "firstName": "Marie",
  "status": "PROSPECT",
  "user": {
    "id": "uuid",
    "email": "marie.dupont@example.com",
    "role": "STUDENT"
  }
}
```

**Erreurs possibles** :
- `409 Conflict` : Email déjà utilisé
- `409 Conflict` : NEPH déjà utilisé
- `400 Bad Request` : Validation échouée

---

### 2. Lister tous les élèves

```http
GET /students
GET /students?includeArchived=true
Authorization: Bearer <token>
```

**Query Parameters** :
| Paramètre | Type | Description |
|-----------|------|-------------|
| `includeArchived` | boolean | Inclure les élèves archivés |

**Réponse** : `200 OK`
```json
[
  {
    "id": "uuid",
    "birthName": "DUPONT",
    "firstName": "Marie",
    "status": "ACTIVE",
    "minutesPurchased": 1200,
    "minutesUsed": 300,
    "archivedAt": null,
    "user": {
      "id": "uuid",
      "email": "marie.dupont@example.com",
      "role": "STUDENT"
    }
  }
]
```

---

### 3. Récupérer un élève

```http
GET /students/:id
Authorization: Bearer <token>
```

**Réponse** : `200 OK`
```json
{
  "id": "uuid",
  "birthName": "DUPONT",
  "firstName": "Marie",
  ...
}
```

**Erreurs possibles** :
- `404 Not Found` : Élève introuvable
- `403 Forbidden` : Élève d'un autre tenant

---

### 4. Modifier un élève

```http
PUT /students/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Marie-Claire",
  "phone": "+33698765432",
  "status": "ACTIVE"
}
```

**Réponse** : `200 OK`

**Notes** :
- Tous les champs sont optionnels
- La modification d'email met aussi à jour le User associé
- La modification de NEPH vérifie l'unicité

---

### 5. Archiver un élève

```http
POST /students/:id/archive
Authorization: Bearer <token>
```

**Réponse** : `200 OK`
```json
{
  "id": "uuid",
  "status": "ARCHIVED",
  "archivedAt": "2026-01-26T12:00:00.000Z"
}
```

---

### 6. Restaurer un élève

```http
POST /students/:id/restore
Authorization: Bearer <token>
```

**Réponse** : `200 OK`
```json
{
  "id": "uuid",
  "status": "ACTIVE",
  "archivedAt": null
}
```

**Erreurs possibles** :
- `409 Conflict` : L'élève n'est pas archivé

---

### 7. Supprimer définitivement

```http
DELETE /students/:id
Authorization: Bearer <token>
```

**⚠️ ADMIN uniquement**

**Réponse** : `204 No Content`

**Attention** : Supprime également le compte User associé.

---

### 8. Consulter les heures

```http
GET /students/:id/hours
Authorization: Bearer <token>
```

**Réponse** : `200 OK`
```json
{
  "minutesPurchased": 1200,
  "minutesUsed": 300,
  "minutesRemaining": 900,
  "hoursPurchased": 20,
  "hoursUsed": 5,
  "hoursRemaining": 15
}
```

---

### 9. Ajouter des heures achetées

```http
POST /students/:id/hours/purchase
Authorization: Bearer <token>
Content-Type: application/json

{
  "minutes": 600
}
```

**Réponse** : `200 OK`
```json
{
  "minutesPurchased": 1800
}
```

---

### 10. Enregistrer des heures consommées

```http
POST /students/:id/hours/use
Authorization: Bearer <token>
Content-Type: application/json

{
  "minutes": 60
}
```

**Réponse** : `200 OK`

**Erreurs possibles** :
- `409 Conflict` : Heures insuffisantes

---

## Validation (DTOs)

### CreateStudentDto

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| `email` | string | ✅ | Format email valide |
| `password` | string | ✅ | Min 8 caractères |
| `birthName` | string | ✅ | Min 2 caractères |
| `firstName` | string | ✅ | Min 2 caractères |
| `birthDate` | string | ✅ | Format ISO 8601 |
| `birthCity` | string | ✅ | |
| `birthZipCode` | string | ❌ | |
| `birthCountry` | string | ✅ | Défaut: "FRANCE" |
| `address` | string | ✅ | |
| `city` | string | ✅ | |
| `zipCode` | string | ✅ | |
| `phone` | string | ✅ | Format téléphone FR |
| `neph` | string | ❌ | Unique |
| `ePhotoCode` | string | ❌ | |
| `hasIdCard` | boolean | ❌ | Défaut: false |
| `hasProofOfAddress` | boolean | ❌ | Défaut: false |
| `hasAssr2` | boolean | ❌ | Défaut: false |
| `hasJdcCertificate` | boolean | ❌ | Défaut: false |
| `hasCensusCertificate` | boolean | ❌ | Défaut: false |
| `needsMedicalOpinion` | boolean | ❌ | Défaut: false |
| `hasMedicalOpinion` | boolean | ❌ | Défaut: false |
| `licenseType` | enum | ❌ | Défaut: "B" |
| `status` | enum | ❌ | Défaut: "PROSPECT" |
| `minutesPurchased` | number | ❌ | Défaut: 0, min: 0 |
| `guardianName` | string | ❌ | |
| `guardianPhone` | string | ❌ | Format téléphone FR |
| `guardianEmail` | string | ❌ | Format email |
| `guardianRelation` | string | ❌ | |

### UpdateStudentDto

Tous les champs de `CreateStudentDto` sont optionnels, plus :

| Champ | Type | Description |
|-------|------|-------------|
| `archivedAt` | string \| null | Date d'archivage |

---

## Logique Métier

### Création d'élève
1. Hash du mot de passe (bcrypt, 10 rounds)
2. Vérification email unique (global)
3. Vérification NEPH unique (si fourni)
4. Transaction atomique :
   - Création User (role: STUDENT)
   - Création Student lié au User
5. Retour de l'élève avec infos User

### Gestion des heures
- **minutesPurchased** : Total heures achetées (en minutes)
- **minutesUsed** : Total heures consommées
- **minutesRemaining** : Calculé dynamiquement (`purchased - used`)
- Vérification du solde avant consommation

### Archivage
- **Soft delete** : `archivedAt` = date actuelle
- **Status** passe à `ARCHIVED`
- Non visible par défaut dans les listes
- Restauration possible

### Suppression définitive
- **Hard delete** : Suppression en BDD
- Supprime Student ET User associé
- Transaction atomique
- Réservé aux ADMIN

---

## Tests

### Tests Service (17 tests)
```
✅ create - Création succès
✅ create - Rejet email dupliqué
✅ create - Rejet NEPH dupliqué
✅ findAll - Liste sans archivés
✅ findAll - Liste avec archivés
✅ findOne - Par ID
✅ findOne - Rejet non trouvé
✅ findOne - Rejet autre tenant
✅ update - Mise à jour
✅ update - Update email
✅ update - Rejet email déjà pris
✅ archive - Archivage
✅ restore - Restauration
✅ restore - Rejet si non archivé
✅ remove - Suppression
✅ getRemainingMinutes - Calcul
✅ addPurchasedMinutes - Achat
✅ addUsedMinutes - Consommation
✅ addUsedMinutes - Rejet solde insuffisant
```

### Tests Controller (12 tests)
```
✅ create - POST /students
✅ findAll - GET /students
✅ findAll - GET /students?includeArchived=true
✅ findOne - GET /students/:id
✅ update - PUT /students/:id
✅ archive - POST /students/:id/archive
✅ restore - POST /students/:id/restore
✅ remove - DELETE /students/:id
✅ getHours - GET /students/:id/hours
✅ addPurchasedHours - POST /students/:id/hours/purchase
✅ addUsedHours - POST /students/:id/hours/use
```

### Lancer les tests
```bash
# Tests module Student uniquement
npm run test -- --testPathPattern=student

# Tous les tests backend
npm run test
```

---

## Sécurités Implémentées

### Multi-tenant
- Chaque requête vérifie le `tenantId` du JWT
- Un utilisateur ne peut voir/modifier que les élèves de son auto-école
- Tentative d'accès à un autre tenant → `403 Forbidden`

### Validation UUID
- Tous les `:id` passent par `ParseUUIDPipe`
- Format UUID invalide → `400 Bad Request`

### Unicité
- **Email** : Unique global (pas de doublon cross-tenant)
- **NEPH** : Unique global (conformité ANTS)

### Rôles
- CRUD : `ADMIN` + `SECRETARY`
- DELETE définitif : `ADMIN` uniquement

---

## Exemples cURL

### Créer un élève
```bash
curl -X POST http://localhost:3000/students \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "eleve@test.fr",
    "password": "Password123!",
    "birthName": "MARTIN",
    "firstName": "Paul",
    "birthDate": "2005-03-20",
    "birthCity": "Lyon",
    "birthCountry": "FRANCE",
    "address": "5 avenue Jean Jaurès",
    "city": "Lyon",
    "zipCode": "69003",
    "phone": "+33612345678"
  }'
```

### Lister les élèves
```bash
curl -X GET http://localhost:3000/students \
  -H "Authorization: Bearer <token>"
```

### Ajouter 10 heures de conduite
```bash
curl -X POST http://localhost:3000/students/<id>/hours/purchase \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"minutes": 600}'
```

---

## Évolutions Futures

- [ ] Recherche et filtres (nom, statut, permis)
- [ ] Pagination des résultats
- [ ] Export PDF du dossier élève
- [ ] Historique des modifications (audit log intégré)
- [ ] Notifications (fin de crédit heures)
- [ ] Intégration ANTS (synchronisation NEPH)
