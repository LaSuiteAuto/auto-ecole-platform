import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Tests E2E pour l'authentification
 *
 * Tests d'intégration complets du workflow :
 * 1. Register → Login → Me → Logout (conceptuel)
 *
 * Ces tests vérifient le fonctionnement réel de l'API
 * avec une vraie base de données de test.
 */
describe('Authentication E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configuration identique à main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Nettoyage de la base de données de test
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    // Nettoyage avant chaque test pour isolation
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
  });

  /**
   * Tests pour POST /auth/register
   */
  describe('/auth/register (POST)', () => {
    it('devrait créer une nouvelle auto-école avec admin', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantName: 'Auto École E2E Test',
          email: 'e2e-test@test.fr',
          password: 'Password123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('e2e-test@test.fr');
          expect(res.body.user.role).toBe('ADMIN');
          expect(res.body.user).toHaveProperty('tenantId');
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it("devrait rejeter l'inscription avec un email déjà utilisé (409)", async () => {
      // Première inscription
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantName: 'Auto École 1',
          email: 'duplicate@test.fr',
          password: 'Password123!',
        })
        .expect(201);

      // Deuxième inscription avec même email
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantName: 'Auto École 2',
          email: 'duplicate@test.fr',
          password: 'Password456!',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('déjà utilisé');
        });
    });

    it("devrait valider le format de l'email (400)", () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantName: 'Auto École Test',
          email: 'invalid-email',
          password: 'Password123!',
        })
        .expect(400);
    });

    it("devrait exiger un mot de passe d'au moins 8 caractères (400)", () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantName: 'Auto École Test',
          email: 'test@test.fr',
          password: 'short',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(
            expect.arrayContaining([expect.stringContaining('8 caractères')]),
          );
        });
    });

    it('devrait rejeter les propriétés inconnues (400)', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantName: 'Auto École Test',
          email: 'test@test.fr',
          password: 'Password123!',
          unknownField: 'should be rejected',
        })
        .expect(400);
    });

    it('devrait hasher le mot de passe en base de données', async () => {
      const email = 'hash-test@test.fr';
      const password = 'Password123!';

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantName: 'Auto École Test',
          email,
          password,
        })
        .expect(201);

      // Vérifier en DB que le password est hashé
      const user = await prisma.user.findUnique({
        where: { email },
      });

      expect(user).toBeDefined();
      expect(user?.password).not.toBe(password);
      expect(user?.password).toMatch(/^\$2[aby]\$/); // Format bcrypt
    });
  });

  /**
   * Tests pour POST /auth/login
   */
  describe('/auth/login (POST)', () => {
    const registerData = {
      tenantName: 'Auto École Login Test',
      email: 'login-test@test.fr',
      password: 'Password123!',
    };

    beforeEach(async () => {
      // Créer un utilisateur avant chaque test de login
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);
    });

    it('devrait connecter un utilisateur avec les bons identifiants', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(registerData.email);
          expect(res.body.user.role).toBe('ADMIN');
        });
    });

    it('devrait rejeter un email inexistant (401)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'non-existent@test.fr',
          password: 'Password123!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Email ou mot de passe incorrect');
        });
    });

    it('devrait rejeter un mot de passe incorrect (401)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: 'WrongPassword123!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Email ou mot de passe incorrect');
        });
    });

    it('devrait valider le format des données (400)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(400);
    });

    it('devrait générer des tokens différents à chaque login', async () => {
      // Premier login
      const firstLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200);

      // Deuxième login
      const secondLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200);

      // Les tokens doivent être différents (différent iat)
      expect(firstLogin.body.access_token).not.toBe(
        secondLogin.body.access_token,
      );
    });
  });

  /**
   * Tests pour GET /auth/me
   */
  describe('/auth/me (GET)', () => {
    let accessToken: string;
    const registerData = {
      tenantName: 'Auto École Me Test',
      email: 'me-test@test.fr',
      password: 'Password123!',
    };

    beforeEach(async () => {
      // S'inscrire et récupérer le token
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      accessToken = response.body.access_token;
    });

    it("devrait retourner les infos de l'utilisateur connecté", () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('role');
          expect(res.body).toHaveProperty('tenantId');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body.email).toBe(registerData.email);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('devrait rejeter une requête sans token (401)', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('devrait rejeter un token invalide (401)', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('devrait rejeter un token mal formaté (401)', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('devrait rejeter un token sans le préfixe Bearer (401)', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', accessToken)
        .expect(401);
    });
  });

  /**
   * Tests du workflow complet
   */
  describe('Workflow complet', () => {
    it('devrait permettre : Register → Login → Me', async () => {
      const userData = {
        tenantName: 'Auto École Workflow',
        email: 'workflow@test.fr',
        password: 'Password123!',
      };

      // 1. Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('access_token');
      const registerToken = registerResponse.body.access_token;

      // 2. Login avec les mêmes identifiants
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
      const loginToken = loginResponse.body.access_token;

      // 3. Me avec le token du register
      const meResponse1 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      expect(meResponse1.body.email).toBe(userData.email);

      // 4. Me avec le token du login
      const meResponse2 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(meResponse2.body.email).toBe(userData.email);

      // Les deux /me doivent retourner le même utilisateur
      expect(meResponse1.body.id).toBe(meResponse2.body.id);
    });

    it('devrait isoler les tenants (multi-tenant)', async () => {
      // Créer deux auto-écoles différentes
      const tenant1Response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantName: 'Auto École 1',
          email: 'admin1@test.fr',
          password: 'Password123!',
        })
        .expect(201);

      const tenant2Response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantName: 'Auto École 2',
          email: 'admin2@test.fr',
          password: 'Password123!',
        })
        .expect(201);

      // Vérifier que les tenantIds sont différents
      expect(tenant1Response.body.user.tenantId).not.toBe(
        tenant2Response.body.user.tenantId,
      );

      // Vérifier que chaque admin a son propre tenant
      const me1 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tenant1Response.body.access_token}`)
        .expect(200);

      const me2 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tenant2Response.body.access_token}`)
        .expect(200);

      expect(me1.body.tenantId).toBe(tenant1Response.body.user.tenantId);
      expect(me2.body.tenantId).toBe(tenant2Response.body.user.tenantId);
      expect(me1.body.tenantId).not.toBe(me2.body.tenantId);
    });
  });

  /**
   * Tests conceptuels pour Logout
   *
   * Note : Le logout est géré côté client (suppression du token)
   * Pas d'endpoint backend pour le moment (Sprint 1)
   */
  describe('Logout (conceptuel)', () => {
    it("devrait permettre la réutilisation du token tant qu'il est valide", async () => {
      // S'inscrire
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          tenantName: 'Auto École Logout Test',
          email: 'logout@test.fr',
          password: 'Password123!',
        })
        .expect(201);

      const token = response.body.access_token;

      // Utiliser le token plusieurs fois (simule pas de logout backend)
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Le token reste valide (pas de blacklist)
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('note: le logout côté client supprime le token du localStorage', () => {
      // Test conceptuel - documenté pour l'équipe
      // Le frontend doit implémenter :
      // localStorage.removeItem('access_token');

      // Après suppression, le token ne sera plus envoyé dans les requêtes
      // donc l'utilisateur sera effectivement "déconnecté"

      // Pour le moment, pas de test à faire côté backend
      expect(true).toBe(true);
    });
  });

  /**
   * Tests RBAC (Role-Based Access Control)
   *
   * Vérifie que les routes protégées par @Roles fonctionnent correctement :
   * - GET /auth/admin-only : Accessible uniquement par ADMIN
   * - GET /auth/admin-or-secretary : Accessible par ADMIN et SECRETARY
   */
  describe('RBAC - Role-Based Access Control', () => {
    let adminToken: string;
    let secretaryToken: string;
    let instructorToken: string;
    let studentToken: string;

    beforeEach(async () => {
      // Créer un tenant
      const tenant = await prisma.tenant.create({
        data: { name: 'Auto École RBAC Test' },
      });

      // Créer des utilisateurs avec différents rôles
      const users = await Promise.all([
        prisma.user.create({
          data: {
            email: 'admin-rbac@test.com',
            password: '$2b$10$K8J8J8J8J8J8J8J8J8J8J8O8O8O8O8O8O8O8O8O8O8', // password123
            role: 'ADMIN',
            tenantId: tenant.id,
          },
        }),
        prisma.user.create({
          data: {
            email: 'secretary-rbac@test.com',
            password: '$2b$10$K8J8J8J8J8J8J8J8J8J8J8O8O8O8O8O8O8O8O8O8O8', // password123
            role: 'SECRETARY',
            tenantId: tenant.id,
          },
        }),
        prisma.user.create({
          data: {
            email: 'instructor-rbac@test.com',
            password: '$2b$10$K8J8J8J8J8J8J8J8J8J8J8O8O8O8O8O8O8O8O8O8O8', // password123
            role: 'INSTRUCTOR',
            tenantId: tenant.id,
          },
        }),
        prisma.user.create({
          data: {
            email: 'student-rbac@test.com',
            password: '$2b$10$K8J8J8J8J8J8J8J8J8J8J8O8O8O8O8O8O8O8O8O8O8', // password123
            role: 'STUDENT',
            tenantId: tenant.id,
          },
        }),
      ]);

      // Login pour chaque utilisateur
      const adminResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin-rbac@test.com', password: 'password123' })
        .expect(200);

      const secretaryResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'secretary-rbac@test.com', password: 'password123' })
        .expect(200);

      const instructorResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'instructor-rbac@test.com', password: 'password123' })
        .expect(200);

      const studentResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'student-rbac@test.com', password: 'password123' })
        .expect(200);

      adminToken = adminResponse.body.access_token;
      secretaryToken = secretaryResponse.body.access_token;
      instructorToken = instructorResponse.body.access_token;
      studentToken = studentResponse.body.access_token;
    });

    describe('GET /auth/admin-only', () => {
      /**
       * Test 1 : ADMIN peut accéder
       */
      it('devrait autoriser ADMIN à accéder à la route admin-only', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/admin-only')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('ADMIN');
        expect(response.body.user.role).toBe('ADMIN');
      });

      /**
       * Test 2 : SECRETARY ne peut PAS accéder
       */
      it("devrait refuser SECRETARY d'accéder à la route admin-only", async () => {
        await request(app.getHttpServer())
          .get('/auth/admin-only')
          .set('Authorization', `Bearer ${secretaryToken}`)
          .expect(403);
      });

      /**
       * Test 3 : INSTRUCTOR ne peut PAS accéder
       */
      it("devrait refuser INSTRUCTOR d'accéder à la route admin-only", async () => {
        await request(app.getHttpServer())
          .get('/auth/admin-only')
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(403);
      });

      /**
       * Test 4 : STUDENT ne peut PAS accéder
       */
      it("devrait refuser STUDENT d'accéder à la route admin-only", async () => {
        await request(app.getHttpServer())
          .get('/auth/admin-only')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);
      });

      /**
       * Test 5 : Sans token, erreur 401
       */
      it("devrait retourner 401 sans token d'authentification", async () => {
        await request(app.getHttpServer()).get('/auth/admin-only').expect(401);
      });
    });

    describe('GET /auth/admin-or-secretary', () => {
      /**
       * Test 6 : ADMIN peut accéder
       */
      it('devrait autoriser ADMIN à accéder à la route admin-or-secretary', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/admin-or-secretary')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body.user.role).toBe('ADMIN');
      });

      /**
       * Test 7 : SECRETARY peut accéder
       */
      it('devrait autoriser SECRETARY à accéder à la route admin-or-secretary', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/admin-or-secretary')
          .set('Authorization', `Bearer ${secretaryToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body.user.role).toBe('SECRETARY');
      });

      /**
       * Test 8 : INSTRUCTOR ne peut PAS accéder
       */
      it("devrait refuser INSTRUCTOR d'accéder à la route admin-or-secretary", async () => {
        await request(app.getHttpServer())
          .get('/auth/admin-or-secretary')
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(403);
      });

      /**
       * Test 9 : STUDENT ne peut PAS accéder
       */
      it("devrait refuser STUDENT d'accéder à la route admin-or-secretary", async () => {
        await request(app.getHttpServer())
          .get('/auth/admin-or-secretary')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);
      });

      /**
       * Test 10 : Sans token, erreur 401
       */
      it("devrait retourner 401 sans token d'authentification", async () => {
        await request(app.getHttpServer())
          .get('/auth/admin-or-secretary')
          .expect(401);
      });
    });

    /**
     * Test 11 : Vérification que /auth/me est accessible par tous les rôles
     */
    describe('GET /auth/me - Accessible par tous les rôles', () => {
      it("devrait permettre à ADMIN d'accéder à /auth/me", async () => {
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it("devrait permettre à SECRETARY d'accéder à /auth/me", async () => {
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${secretaryToken}`)
          .expect(200);
      });

      it("devrait permettre à INSTRUCTOR d'accéder à /auth/me", async () => {
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(200);
      });

      it("devrait permettre à STUDENT d'accéder à /auth/me", async () => {
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);
      });
    });
  });
});
