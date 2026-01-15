# 🔐 API d'Authentification - Auto-École Platform

Documentation complète des endpoints d'authentification.

---

## 📋 Table des matières

1. [POST /auth/register](#post-authregister) - Inscription
2. [POST /auth/login](#post-authlogin) - Connexion
3. [GET /auth/me](#get-authme) - Utilisateur connecté
4. [Logout](#logout) - Déconnexion (côté client)
5. [Exemples cURL](#exemples-curl)
6. [Sécurité](#sécurité)

---

## POST /auth/register

Inscription d'une nouvelle auto-école avec son administrateur.

### Endpoint
```
POST http://localhost:3000/auth/register
```

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "tenantName": "Auto École Demo",
  "email": "admin@demo.fr",
  "password": "Password123!"
}
```

### Validation
- `tenantName` : string, requis, non vide
- `email` : email valide, requis, unique
- `password` : string, requis, minimum 8 caractères

### Réponse succès (201 Created)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@demo.fr",
    "role": "ADMIN",
    "tenantId": "660e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Erreurs possibles

**409 Conflict** - Email déjà utilisé
```json
{
  "statusCode": 409,
  "message": "Cet email est déjà utilisé",
  "error": "Conflict"
}
```

**400 Bad Request** - Validation échouée
```json
{
  "statusCode": 400,
  "message": [
    "Le mot de passe doit contenir au moins 8 caractères",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

---

## POST /auth/login

Connexion d'un utilisateur existant.

### Endpoint
```
POST http://localhost:3000/auth/login
```

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "email": "admin@demo.fr",
  "password": "Password123!"
}
```

### Validation
- `email` : email valide, requis
- `password` : string, requis

### Réponse succès (200 OK)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@demo.fr",
    "role": "ADMIN",
    "tenantId": "660e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Erreurs possibles

**401 Unauthorized** - Identifiants incorrects
```json
{
  "statusCode": 401,
  "message": "Email ou mot de passe incorrect",
  "error": "Unauthorized"
}
```

**400 Bad Request** - Validation échouée
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password should not be empty"
  ],
  "error": "Bad Request"
}
```

---

## GET /auth/me

Récupère les informations de l'utilisateur connecté.

### Endpoint
```
GET http://localhost:3000/auth/me
```

### Headers
```
Authorization: Bearer <access_token>
```

### Réponse succès (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@demo.fr",
  "role": "ADMIN",
  "tenantId": "660e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-01-13T12:00:00.000Z"
}
```

### Erreurs possibles

**401 Unauthorized** - Token manquant
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**401 Unauthorized** - Token invalide ou expiré
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Logout

### Implémentation (Sprint 1)

Le logout est géré **côté client uniquement** :

```javascript
// Frontend
localStorage.removeItem('access_token');
// ou
sessionStorage.removeItem('access_token');
```

**Pas d'endpoint backend nécessaire pour le moment.**

### Pourquoi cette approche ?

✅ **Avantages :**
- Simple et rapide
- Stateless (principe JWT)
- Pas de gestion de blacklist

⚠️ **Inconvénients :**
- Token reste valide jusqu'à expiration (7 jours)
- Pas de révocation immédiate

### Solution future (Sprint 2+)

- Blacklist Redis pour invalider les tokens
- Endpoint `POST /auth/logout`
- Refresh tokens avec rotation

---

## 🧪 Exemples cURL

### Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "Auto École Demo",
    "email": "admin@demo.fr",
    "password": "Password123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.fr",
    "password": "Password123!"
  }'
```

### Me
```bash
# Remplacer YOUR_TOKEN par le token reçu lors du login
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔒 Sécurité

### Mots de passe
- ✅ Hashés avec bcrypt (10 rounds)
- ✅ Jamais retournés dans les réponses
- ✅ Minimum 8 caractères

### JWT
- ✅ Signature avec secret (HS256)
- ✅ Expiration après 7 jours
- ✅ Double validation (signature + existence user)
- ⚠️ **IMPORTANT** : Changer `JWT_SECRET` en production !

### Validation
- ✅ DTOs avec class-validator
- ✅ Whitelist (propriétés inconnues rejetées)
- ✅ Transformation automatique des types

### CORS
- ✅ Activé pour le frontend (http://localhost:3001)
- ⚠️ À configurer selon environnement

### Messages d'erreur
- ✅ Génériques (ne révèlent pas si email existe)
- ✅ Détaillés pour validation (aide au développement)

---

## 🚀 Workflow complet

### 1. Inscription nouvelle auto-école
```
POST /auth/register
→ Crée tenant
→ Crée admin
→ Retourne JWT
→ Stocker token côté client
```

### 2. Connexion utilisateur existant
```
POST /auth/login
→ Vérifie credentials
→ Retourne JWT
→ Stocker token côté client
```

### 3. Requêtes authentifiées
```
GET /auth/me
Header: Authorization: Bearer <token>
→ Valide token
→ Retourne user
```

### 4. Déconnexion
```
Supprimer token côté client
→ Utilisateur déconnecté
```

---

## 📌 Notes importantes

### Pour l'équipe

1. **Jamais commit le JWT_SECRET** dans Git
2. **Toujours utiliser HTTPS** en production
3. **Implémenter rate limiting** pour login/register
4. **Logger les tentatives de connexion** échouées
5. **Monitorer les tokens** expirés

### Pour Sprint 2+

- [ ] Reset password avec email
- [ ] Refresh tokens
- [ ] Blacklist JWT (Redis)
- [ ] Rate limiting
- [ ] 2FA (optionnel)
- [ ] OAuth (Google, etc.)

---

## 🎯 Utilisateurs de test (après seed)

```javascript
// Admin
{
  "email": "admin@autoecole.com",
  "password": "admin123"
}

// Instructeur
{
  "email": "instructor@autoecole.com",
  "password": "instructor123"
}

// Étudiant
{
  "email": "student@autoecole.com",
  "password": "student123"
}
```

---

## 🐛 Debugging

### Le backend ne démarre pas
```bash
docker compose logs backend
```

### Erreur "Unauthorized"
1. Vérifier que le token est dans le header
2. Format : `Authorization: Bearer <token>`
3. Vérifier que le token n'est pas expiré
4. Vérifier JWT_SECRET

### Erreur "Email déjà utilisé"
Vérifier en DB ou utiliser un autre email

### Erreur Prisma
```bash
docker exec -it autoecole-backend npx prisma generate
docker exec -it autoecole-backend npx prisma migrate dev
```

---

**Fait avec ❤️ pour l'équipe Auto-École Platform**
