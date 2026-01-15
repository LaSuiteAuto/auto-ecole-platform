# 🏢 Multi-Tenant Architecture

## 🎯 Principe

Chaque auto-école est un **tenant isolé**. Les données d'une auto-école ne doivent **JAMAIS** être accessibles par une autre.

---

## 🔑 Composants Clés

### 1. TenantId dans TOUS les Modèles

#### Schema Prisma

```prisma
model Tenant {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  
  users     User[]
  students  Student[]
  lessons   Lesson[]
  // ... tous les autres modèles
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  role      UserRole
  tenantId  String   // ← OBLIGATOIRE
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  createdAt DateTime @default(now())
}

model Student {
  id        String   @id @default(uuid())
  name      String
  email     String
  tenantId  String   // ← OBLIGATOIRE
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  createdAt DateTime @default(now())
}

// Même pattern pour TOUS les modèles métier
```

**Règle** : Tout modèle métier DOIT avoir `tenantId`.

---

### 2. TenantId dans le JWT

Le token JWT contient **obligatoirement** le `tenantId` :

```typescript
{
  sub: "user-uuid",           // ID utilisateur
  tenantId: "tenant-uuid",    // ID auto-école ← OBLIGATOIRE
  role: "ADMIN",              // Rôle utilisateur
  iat: 1705147200,
  exp: 1705752000
}
```

Généré dans `AuthService.generateToken()` :

```typescript
private generateToken(userId: string, tenantId: string, role: string): string {
  const payload = {
    sub: userId,
    tenantId,    // ← Inclus dans le token
    role,
  };
  return this.jwtService.sign(payload);
}
```

---

### 3. TenantGuard (OBLIGATOIRE)

#### Fichier

[tenant.guard.ts](../apps/backend/src/auth/guards/tenant.guard.ts)

#### Code

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Bloque si pas de tenantId
    return !!(user && user.tenantId);
  }
}
```

#### Utilisation

```typescript
@Get('students')
@UseGuards(JwtAuthGuard, TenantGuard)  // ← ORDRE IMPORTANT
async getStudents(@CurrentUser() user: CurrentUserData) {
  // user.tenantId est garanti d'exister ici
  return this.studentsService.findAll({ tenantId: user.tenantId });
}
```

**Ordre des Guards** :
1. `JwtAuthGuard` - Authentifie et charge `req.user`
2. `TenantGuard` - Vérifie `tenantId` existe
3. `RolesGuard` - Vérifie les rôles (optionnel)

---

### 4. Filtrage Prisma OBLIGATOIRE

#### ❌ INTERDIT

```typescript
// DANGER : Récupère TOUTES les données
await prisma.student.findMany();
await prisma.lesson.findMany();

// DANGER : Modification sans vérification tenant
await prisma.student.update({
  where: { id: studentId },
  data: { name: 'New Name' }
});

// DANGER : Suppression sans vérification tenant
await prisma.student.delete({
  where: { id: studentId }
});
```

#### ✅ OBLIGATOIRE

```typescript
// CORRECT : Filtré par tenantId
await prisma.student.findMany({
  where: { tenantId }
});

// CORRECT : findUnique avec tenantId
await prisma.student.findUnique({
  where: { 
    id: studentId,
    tenantId  // ← OBLIGATOIRE même pour findUnique
  }
});

// CORRECT : create avec tenantId
await prisma.student.create({
  data: {
    name: 'Jean Dupont',
    email: 'jean@example.com',
    tenantId  // ← OBLIGATOIRE
  }
});

// CORRECT : update avec vérification tenant
await prisma.student.update({
  where: { 
    id: studentId,
    tenantId  // ← Empêche modification d'un student d'un autre tenant
  },
  data: { name: 'New Name' }
});

// CORRECT : delete avec vérification tenant
await prisma.student.delete({
  where: { 
    id: studentId,
    tenantId  // ← Empêche suppression d'un student d'un autre tenant
  }
});
```

---

## 🛡️ Sécurité

### Scénarios d'Attaque Prévenus

#### 1. Accès Direct par ID

**Attaque** : Un utilisateur de l'auto-école A essaie d'accéder aux données de l'auto-école B.

```http
GET /students/uuid-student-autoecole-b
Authorization: Bearer <token-autoecole-a>
```

**Protection** :

```typescript
async getStudent(id: string, tenantId: string) {
  // Requête avec tenantId empêche l'accès
  const student = await this.prisma.student.findUnique({
    where: { 
      id,
      tenantId  // ← Si student appartient à autre tenant, retourne null
    }
  });
  
  if (!student) {
    throw new NotFoundException('Student not found');
  }
  
  return student;
}
```

#### 2. Modification de Ressource

**Attaque** : Modification d'un étudiant d'un autre tenant.

```http
PATCH /students/uuid-student-autoecole-b
Authorization: Bearer <token-autoecole-a>
Body: { "name": "Hacked" }
```

**Protection** :

```typescript
async updateStudent(id: string, data: UpdateStudentDto, tenantId: string) {
  // Update échoue si id + tenantId ne correspondent pas
  const updated = await this.prisma.student.update({
    where: { 
      id,
      tenantId  // ← Empêche la mise à jour
    },
    data
  });
  
  return updated;  // Prisma lève une erreur si not found
}
```

#### 3. Suppression de Ressource

**Attaque** : Suppression de données d'un autre tenant.

**Protection** : Même principe avec `delete({ where: { id, tenantId } })`.

---

## 📋 Checklist Développeur

Avant chaque commit, vérifier :

### Routes
- [ ] `@UseGuards(JwtAuthGuard, TenantGuard)` appliqué
- [ ] `@CurrentUser()` utilisé pour récupérer tenantId
- [ ] Aucune route métier sans guards

### Services
- [ ] Toutes les méthodes acceptent `tenantId` en paramètre
- [ ] Toutes les requêtes Prisma filtrent par `tenantId`
- [ ] Les `create()` incluent `tenantId` dans les données
- [ ] Les `update()` vérifient `tenantId` dans le `where`
- [ ] Les `delete()` vérifient `tenantId` dans le `where`

### Tests
- [ ] Tests vérifient l'isolation des tenants
- [ ] Tests tentent d'accéder à des ressources d'autres tenants
- [ ] Tests E2E avec plusieurs tenants

---

## 🧪 Tests Multi-Tenant

### Test Unitaire

```typescript
describe('StudentsService', () => {
  it('ne devrait retourner que les students du tenant', async () => {
    // Arrange
    const tenantId = 'tenant-a';
    
    // Act
    const students = await service.findAll({ tenantId });
    
    // Assert
    students.forEach(student => {
      expect(student.tenantId).toBe(tenantId);
    });
  });
  
  it('ne devrait pas permettre de modifier un student d\'un autre tenant', async () => {
    // Arrange
    const studentFromTenantB = await createStudent({ tenantId: 'tenant-b' });
    
    // Act & Assert
    await expect(
      service.update(studentFromTenantB.id, { name: 'Hack' }, 'tenant-a')
    ).rejects.toThrow();
  });
});
```

### Test E2E

```typescript
describe('GET /students', () => {
  it('devrait retourner uniquement les students du tenant de l\'utilisateur', async () => {
    // Créer 2 tenants avec des students
    const tenantA = await createTenant('Auto École A');
    const tenantB = await createTenant('Auto École B');
    
    await createStudent({ tenantId: tenantA.id, name: 'Student A' });
    await createStudent({ tenantId: tenantB.id, name: 'Student B' });
    
    // Login tenant A
    const tokenA = await loginAs(tenantA.adminUser);
    
    // Requête
    const response = await request(app.getHttpServer())
      .get('/students')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    
    // Vérifier isolation
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Student A');
  });
});
```

---

## 🎯 Exemples Complets

### Controller

```typescript
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}
  
  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.studentsService.findAll({ tenantId: user.tenantId });
  }
  
  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.studentsService.findOne(id, user.tenantId);
  }
  
  @Post()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SECRETARY)
  async create(@Body() dto: CreateStudentDto, @CurrentUser() user: CurrentUserData) {
    return this.studentsService.create(dto, user.tenantId);
  }
  
  @Patch(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SECRETARY)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: CurrentUserData
  ) {
    return this.studentsService.update(id, dto, user.tenantId);
  }
  
  @Delete(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.studentsService.remove(id, user.tenantId);
  }
}
```

### Service

```typescript
@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}
  
  async findAll({ tenantId }: { tenantId: string }) {
    return this.prisma.student.findMany({
      where: { tenantId }
    });
  }
  
  async findOne(id: string, tenantId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id, tenantId }
    });
    
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    
    return student;
  }
  
  async create(dto: CreateStudentDto, tenantId: string) {
    return this.prisma.student.create({
      data: {
        ...dto,
        tenantId  // ← Toujours inclure
      }
    });
  }
  
  async update(id: string, dto: UpdateStudentDto, tenantId: string) {
    // Prisma lève PrismaClientKnownRequestError si not found
    return this.prisma.student.update({
      where: { id, tenantId },
      data: dto
    });
  }
  
  async remove(id: string, tenantId: string) {
    return this.prisma.student.delete({
      where: { id, tenantId }
    });
  }
}
```

---

## ⚠️ Erreurs Courantes

### 1. Oublier TenantGuard

```typescript
// ❌ DANGER
@Get('students')
@UseGuards(JwtAuthGuard)  // Manque TenantGuard
async getStudents() {
  // ...
}

// ✅ CORRECT
@Get('students')
@UseGuards(JwtAuthGuard, TenantGuard)
async getStudents() {
  // ...
}
```

### 2. Ne pas filtrer par tenantId

```typescript
// ❌ DANGER
async findAll() {
  return this.prisma.student.findMany();
}

// ✅ CORRECT
async findAll({ tenantId }: { tenantId: string }) {
  return this.prisma.student.findMany({
    where: { tenantId }
  });
}
```

### 3. Oublier tenantId dans create

```typescript
// ❌ DANGER
async create(dto: CreateStudentDto) {
  return this.prisma.student.create({
    data: dto  // Manque tenantId
  });
}

// ✅ CORRECT
async create(dto: CreateStudentDto, tenantId: string) {
  return this.prisma.student.create({
    data: {
      ...dto,
      tenantId
    }
  });
}
```

---

## 📚 Documentation Liée

- [team-rules.md](./team-rules.md) - Règles de l'équipe (section multi-tenant)
- [RBAC.md](./RBAC.md) - Système de rôles
- [tenant.guard.ts](../apps/backend/src/auth/guards/tenant.guard.ts) - Code source

---

## 🎉 Résumé

### Règles d'Or

1. **TenantId PARTOUT** : Tous les modèles métier
2. **TenantId dans JWT** : Toujours présent
3. **TenantGuard OBLIGATOIRE** : Sur toutes les routes métier
4. **Filtrage Prisma** : `where: { tenantId }` sur TOUTES les requêtes
5. **Aucune exception** : Jamais de requête sans tenantId

### En Cas de Doute

**Demander en code review avant de merge.**

La sécurité multi-tenant est **non-négociable**. Une fuite de données peut détruire la confiance et l'entreprise.

**Prenez le temps de bien faire.** 🔒
