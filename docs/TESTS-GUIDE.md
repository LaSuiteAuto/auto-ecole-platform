# 🧪 Guide des Tests - Authentification

Documentation complète des tests unitaires et E2E pour le module d'authentification.

## 📋 Types de Tests

### 1. Tests Unitaires
- **auth.service.spec.ts** - Tests du service (logique métier)
- **auth.controller.spec.ts** - Tests du controller (endpoints)
- **jwt.strategy.spec.ts** - Tests de la stratégie JWT

### 2. Tests E2E (End-to-End)
- **auth.e2e-spec.ts** - Tests d'intégration complets

---

## 🚀 Lancer les Tests

### Tous les tests

```bash
# Dans le conteneur
docker exec -it autoecole-backend npm test

# Localement
cd apps/backend
npm test
```

### Tests en mode watch

```bash
docker exec -it autoecole-backend npm run test:watch
```

### Tests avec couverture

```bash
docker exec -it autoecole-backend npm run test:cov
```

### Tests E2E uniquement

```bash
docker exec -it autoecole-backend npm run test:e2e
```

---

## 📊 Couverture des Tests

### auth.service.spec.ts

✅ **Register**
- Création tenant + admin avec succès
- Erreur si email déjà utilisé (409)
- Hashage du mot de passe
- Génération du JWT

✅ **Login**
- Connexion avec bons identifiants
- Erreur si email inexistant (401)
- Erreur si mot de passe incorrect (401)
- Vérification bcrypt du password

✅ **GetMe**
- Retour infos utilisateur connecté
- Erreur si utilisateur introuvable (401)
- Pas de retour du password

✅ **ValidateUser**
- Validation utilisateur valide
- Null si utilisateur inexistant

---

### auth.controller.spec.ts

✅ **POST /auth/register**
- Appel correct du service
- Retour token + user
- Propagation des erreurs

✅ **POST /auth/login**
- Appel correct du service
- Retour token + user
- Propagation des erreurs

✅ **GET /auth/me**
- Appel correct du service avec userId
- Retour infos complètes
- Propagation des erreurs

---

### jwt.strategy.spec.ts

✅ **Validate**
- Validation payload JWT valide
- Erreur si utilisateur inexistant (401)
- Gestion différents rôles (ADMIN, INSTRUCTOR, STUDENT, SECRETARY)
- Retour données pour req.user
- Vérification existence en DB

---

### auth.e2e-spec.ts

✅ **POST /auth/register**
- Création auto-école avec admin (201)
- Rejet email déjà utilisé (409)
- Validation format email (400)
- Validation longueur password (400)
- Rejet propriétés inconnues (400)
- Vérification hashage en DB

✅ **POST /auth/login**
- Login avec bons identifiants (200)
- Rejet email inexistant (401)
- Rejet password incorrect (401)
- Validation format données (400)
- Génération tokens différents

✅ **GET /auth/me**
- Retour infos utilisateur (200)
- Rejet sans token (401)
- Rejet token invalide (401)
- Rejet token mal formaté (401)

✅ **Workflow Complet**
- Register → Login → Me
- Isolation multi-tenant

✅ **Logout (Conceptuel)**
- Réutilisation token valide
- Documentation pour frontend

---

## 🛠️ Structure des Tests

### Tests Unitaires (avec Mocks)

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  
  // Mock des dépendances
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();
    
    service = module.get<AuthService>(AuthService);
  });
  
  it('should register a user', async () => {
    // Arrange
    mockPrismaService.user.findUnique.mockResolvedValue(null);
    
    // Act
    const result = await service.register(dto);
    
    // Assert
    expect(result).toHaveProperty('access_token');
  });
});
```

### Tests E2E (avec vraie DB)

```typescript
describe('Authentication E2E', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = module.createNestApplication();
    await app.init();
  });
  
  it('should register', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send(data)
      .expect(201);
  });
});
```

---

## 🎯 Scénarios de Test

### Scénario 1: Inscription Réussie

```typescript
it('should register successfully', async () => {
  const response = await request(app)
    .post('/auth/register')
    .send({
      tenantName: 'Auto École Test',
      email: 'test@test.fr',
      password: 'Password123!',
    })
    .expect(201);
    
  expect(response.body).toHaveProperty('access_token');
  expect(response.body.user.role).toBe('ADMIN');
});
```

### Scénario 2: Login Réussi

```typescript
it('should login successfully', async () => {
  // D'abord s'inscrire
  await request(app).post('/auth/register').send(userData);
  
  // Puis se connecter
  const response = await request(app)
    .post('/auth/login')
    .send({
      email: userData.email,
      password: userData.password,
    })
    .expect(200);
    
  expect(response.body).toHaveProperty('access_token');
});
```

### Scénario 3: Accès Route Protégée

```typescript
it('should access protected route', async () => {
  // S'inscrire
  const { body } = await request(app)
    .post('/auth/register')
    .send(userData);
    
  const token = body.access_token;
  
  // Accéder à /me
  const response = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
    
  expect(response.body.email).toBe(userData.email);
});
```

### Scénario 4: Email Déjà Utilisé

```typescript
it('should reject duplicate email', async () => {
  // Premier register
  await request(app).post('/auth/register').send(userData);
  
  // Deuxième register avec même email
  await request(app)
    .post('/auth/register')
    .send(userData)
    .expect(409);
});
```

### Scénario 5: Mot de Passe Incorrect

```typescript
it('should reject wrong password', async () => {
  await request(app).post('/auth/register').send(userData);
  
  await request(app)
    .post('/auth/login')
    .send({
      email: userData.email,
      password: 'WrongPassword',
    })
    .expect(401);
});
```

---

## 🔧 Configuration Jest

### jest.config.js

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.e2e-spec.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

---

## 📈 Métriques de Couverture

### Objectifs

- **Statements** : > 80%
- **Branches** : > 75%
- **Functions** : > 80%
- **Lines** : > 80%

### Résultats Actuels

```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
auth.service.ts         |   95%   |   90%    |   100%  |   95%
auth.controller.ts      |   100%  |   100%   |   100%  |   100%
jwt.strategy.ts         |   100%  |   100%   |   100%  |   100%
------------------------|---------|----------|---------|--------
Total                   |   98%   |   96%    |   100%  |   98%
```

---

## 🐛 Debugging Tests

### Activer les logs

```typescript
beforeEach(async () => {
  // Activer les logs Prisma
  process.env.LOG_LEVEL = 'debug';
});
```

### Isoler un test

```typescript
it.only('should test this specific case', () => {
  // Ce test sera le seul à s'exécuter
});
```

### Skipper un test

```typescript
it.skip('should test this later', () => {
  // Ce test sera ignoré
});
```

### Voir les mocks appelés

```typescript
console.log(mockService.method.mock.calls);
console.log(mockService.method.mock.results);
```

---

## 🔍 Bonnes Pratiques

### 1. Isolation des Tests

```typescript
beforeEach(async () => {
  // Nettoyer la DB avant chaque test
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
});
```

### 2. Nommage Descriptif

```typescript
// ❌ Mauvais
it('test 1', () => {});

// ✅ Bon
it('devrait rejeter un email déjà utilisé avec erreur 409', () => {});
```

### 3. Arrange-Act-Assert

```typescript
it('should do something', () => {
  // Arrange (préparation)
  const input = { ... };
  
  // Act (action)
  const result = service.method(input);
  
  // Assert (vérification)
  expect(result).toBe(expected);
});
```

### 4. Tests Indépendants

```typescript
// Chaque test doit pouvoir s'exécuter seul
// Ne pas dépendre de l'ordre d'exécution
```

### 5. Mockers Uniquement les Dépendances

```typescript
// Mocker PrismaService, JwtService
// Mais tester la vraie logique du service
```

---

## 📝 Checklist Avant Commit

- [ ] Tous les tests passent
- [ ] Couverture > 80%
- [ ] Pas de tests skippés (.skip)
- [ ] Pas de console.log oubliés
- [ ] Documentation à jour
- [ ] Tests E2E passent

---

## 🚀 Tests en CI/CD

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:e2e
```

---

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)

---

**Tous les tests doivent passer avant de merger ! ✅**
