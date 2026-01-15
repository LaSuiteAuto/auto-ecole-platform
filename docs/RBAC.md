# 🔐 RBAC - Role-Based Access Control

## 📋 Rôles Disponibles

```typescript
enum Role {
  ADMIN = 'ADMIN',
  SECRETARY = 'SECRETARY',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
}
```

---

## 🎯 Convention des Permissions (Sprint 1)

### ADMIN & SECRETARY
✅ Créer des élèves  
✅ Créer des séances  
✅ Créer des moniteurs  
✅ Voir le planning  

### INSTRUCTOR
✅ Voir le planning  
✅ Gérer ses séances assignées  

### STUDENT
✅ Voir le planning  
✅ Voir ses propres séances  

---

## 🔑 JWT Payload

Le token JWT contient le rôle :

```typescript
{
  sub: userId,        // ID utilisateur
  tenantId: string,   // ID auto-école
  role: Role          // Rôle (ADMIN, SECRETARY, etc.)
}
```

---

## 🛡️ Utilisation des Guards

### Setup de Base

```typescript
import { JwtAuthGuard, RolesGuard } from './auth/guards';
import { Roles } from './auth/decorators';
import { Role } from './shared';

@Controller('students')
export class StudentsController {
  // ...
}
```

### Protéger une Route avec JWT Uniquement

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: CurrentUserData) {
  // Accessible par tous les utilisateurs authentifiés
  return this.studentsService.getProfile(user.userId);
}
```

### Protéger avec Rôles Spécifiques

```typescript
@Post('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SECRETARY)
async createStudent(@Body() dto: CreateStudentDto) {
  // Accessible uniquement par ADMIN et SECRETARY
  return this.studentsService.create(dto);
}
```

### Un Seul Rôle

```typescript
@Delete('students/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
async deleteStudent(@Param('id') id: string) {
  // Accessible uniquement par ADMIN
  return this.studentsService.delete(id);
}
```

### Route Publique (Planning)

```typescript
@Get('planning')
@UseGuards(JwtAuthGuard)
async getPlanning() {
  // Accessible par tous les utilisateurs authentifiés
  // Pas de @Roles = tous les rôles acceptés
  return this.planningService.getAll();
}
```

---

## ⚠️ Règles Importantes

### 1. Ordre des Guards

**TOUJOURS mettre JwtAuthGuard EN PREMIER** :

```typescript
✅ CORRECT
@UseGuards(JwtAuthGuard, RolesGuard)

❌ INCORRECT
@UseGuards(RolesGuard, JwtAuthGuard)
```

**Pourquoi ?**  
JwtAuthGuard charge `req.user`, nécessaire pour RolesGuard.

### 2. Sans @Roles Decorator

Si vous n'utilisez pas `@Roles(...)`, **la route est accessible par tous les utilisateurs authentifiés** :

```typescript
@Get('planning')
@UseGuards(JwtAuthGuard)
async getPlanning() {
  // Accessible par ADMIN, SECRETARY, INSTRUCTOR, STUDENT
  // Tous les utilisateurs avec un token valide
}
```

### 3. Logique OR entre Rôles

Avec plusieurs rôles, c'est une logique **OR** (OU) :

```typescript
@Roles(Role.ADMIN, Role.SECRETARY)
// L'utilisateur doit être ADMIN OU SECRETARY
```

---

## 📝 Exemples Complets

### Gestion des Élèves

```typescript
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  // Créer un élève : ADMIN ou SECRETARY uniquement
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SECRETARY)
  async create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  // Liste des élèves : tous les utilisateurs authentifiés
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.studentsService.findAll();
  }

  // Modifier un élève : ADMIN ou SECRETARY
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SECRETARY)
  async update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  // Supprimer un élève : ADMIN uniquement
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
```

### Planning (Accessible à Tous)

```typescript
@Controller('planning')
export class PlanningController {
  constructor(private planningService: PlanningService) {}

  // Planning visible par tous les utilisateurs authentifiés
  @Get()
  @UseGuards(JwtAuthGuard)
  async getPlanning(@CurrentUser() user: CurrentUserData) {
    // Filtrage par tenantId pour multi-tenant
    return this.planningService.getByTenant(user.tenantId);
  }
}
```

### Gestion des Moniteurs

```typescript
@Controller('instructors')
export class InstructorsController {
  // Créer un moniteur : ADMIN ou SECRETARY
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SECRETARY)
  async create(@Body() dto: CreateInstructorDto) {
    return this.instructorsService.create(dto);
  }

  // Voir les moniteurs : tous les utilisateurs
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.instructorsService.findAll();
  }
}
```

---

## 🔍 Tests

### Tester avec curl

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.fr","password":"Password123!"}'

# Copier le access_token

# 2. Route protégée ADMIN
curl http://localhost:3000/auth/admin-only \
  -H "Authorization: Bearer <access_token>"

# 3. Route protégée ADMIN/SECRETARY
curl http://localhost:3000/auth/admin-or-secretary \
  -H "Authorization: Bearer <access_token>"
```

### Résultats Attendus

| Rôle | `/auth/me` | `/auth/admin-only` | `/auth/admin-or-secretary` |
|------|------------|-------------------|---------------------------|
| ADMIN | ✅ 200 | ✅ 200 | ✅ 200 |
| SECRETARY | ✅ 200 | ❌ 403 | ✅ 200 |
| INSTRUCTOR | ✅ 200 | ❌ 403 | ❌ 403 |
| STUDENT | ✅ 200 | ❌ 403 | ❌ 403 |

---

## 📦 Structure des Fichiers

```
src/
├── shared/
│   ├── enums/
│   │   └── role.enum.ts          # Enum des rôles
│   └── index.ts                   # Export centralisé
├── auth/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts     # Guard JWT
│   │   ├── roles.guard.ts        # Guard RBAC
│   │   └── index.ts              # Export centralisé
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── roles.decorator.ts    # @Roles(...)
│   │   └── index.ts              # Export centralisé
│   └── auth.controller.ts        # Exemples d'utilisation
```

---

## 🚀 Sprint 1 vs Sprint 2+

### Sprint 1 (Actuel)

✅ Enum des rôles  
✅ JWT avec rôle  
✅ JwtAuthGuard  
✅ RolesGuard  
✅ @Roles decorator  
✅ Exemples de routes  

**Pas encore appliqué partout** - juste disponible.

### Sprint 2+

- [ ] Appliquer RolesGuard sur tous les endpoints
- [ ] Tests E2E pour chaque rôle
- [ ] Permissions granulaires (ex: `canEditOwnProfile`)
- [ ] Route-level vs Method-level permissions
- [ ] Audit logs des actions sensibles

---

## 💡 Bonnes Pratiques

### 1. Import Groupé

```typescript
// ✅ BIEN
import { JwtAuthGuard, RolesGuard } from './auth/guards';
import { Roles, CurrentUser } from './auth/decorators';
import { Role } from './shared';

// ❌ MOINS BIEN
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
```

### 2. Constantes pour Groupes de Rôles

```typescript
// shared/constants/role-groups.ts
export const ADMIN_ROLES = [Role.ADMIN];
export const MANAGEMENT_ROLES = [Role.ADMIN, Role.SECRETARY];
export const STAFF_ROLES = [Role.ADMIN, Role.SECRETARY, Role.INSTRUCTOR];

// Utilisation
@Roles(...MANAGEMENT_ROLES)
```

### 3. Documentation des Routes

```typescript
/**
 * POST /students
 * 
 * Permissions: ADMIN, SECRETARY
 * Crée un nouvel élève
 */
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SECRETARY)
async create(@Body() dto: CreateStudentDto) {
  // ...
}
```

---

## 🎯 Résumé

| Concept | Description |
|---------|-------------|
| **Rôles** | ADMIN, SECRETARY, INSTRUCTOR, STUDENT |
| **JWT** | Contient `{ sub, tenantId, role }` |
| **JwtAuthGuard** | Vérifie le token, charge `req.user` |
| **RolesGuard** | Vérifie `req.user.role` |
| **@Roles(...)** | Définit les rôles autorisés |
| **Ordre** | TOUJOURS `@UseGuards(JwtAuthGuard, RolesGuard)` |

**Le système RBAC est maintenant prêt pour Sprint 1 !** 🎉
