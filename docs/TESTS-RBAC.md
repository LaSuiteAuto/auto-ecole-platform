# 🧪 Tests Rapides - RBAC

## 🎯 Tester les Routes avec Rôles

### 1. Login en tant qu'ADMIN

```powershell
$response = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"admin@autoecole.com","password":"admin123"}'

$token = ($response.Content | ConvertFrom-Json).access_token
Write-Host "Token ADMIN: $token"
```

### 2. Tester la Route ADMIN Only

```powershell
# Avec token ADMIN (devrait passer ✅)
Invoke-WebRequest -Uri "http://localhost:3000/auth/admin-only" `
  -Headers @{ "Authorization" = "Bearer $token" }
```

**Résultat attendu** : 200 OK
```json
{
  "message": "Route accessible uniquement par les ADMIN",
  "user": {
    "id": "...",
    "email": "admin@autoecole.com",
    "role": "ADMIN"
  }
}
```

### 3. Tester avec INSTRUCTOR (devrait échouer)

```powershell
# Login INSTRUCTOR
$response = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"instructor@autoecole.com","password":"instructor123"}'

$instructorToken = ($response.Content | ConvertFrom-Json).access_token

# Essayer d'accéder à la route ADMIN
Invoke-WebRequest -Uri "http://localhost:3000/auth/admin-only" `
  -Headers @{ "Authorization" = "Bearer $instructorToken" }
```

**Résultat attendu** : 403 Forbidden

### 4. Tester Route ADMIN ou SECRETARY

```powershell
# Login SECRETARY
$response = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"secretary@autoecole.com","password":"secretary123"}' 

$secretaryToken = ($response.Content | ConvertFrom-Json).access_token

# Accéder à la route ADMIN/SECRETARY
Invoke-WebRequest -Uri "http://localhost:3000/auth/admin-or-secretary" `
  -Headers @{ "Authorization" = "Bearer $secretaryToken" }
```

**Résultat attendu** : 200 OK

---

## 📊 Matrice des Permissions

| Endpoint | ADMIN | SECRETARY | INSTRUCTOR | STUDENT |
|----------|-------|-----------|------------|---------|
| `/auth/me` | ✅ | ✅ | ✅ | ✅ |
| `/auth/admin-only` | ✅ | ❌ | ❌ | ❌ |
| `/auth/admin-or-secretary` | ✅ | ✅ | ❌ | ❌ |

---

## 🔧 Créer un Utilisateur SECRETARY (pour tests)

Ajoutez ceci au seed si nécessaire :

```typescript
// prisma/seed.ts
await prisma.user.create({
  data: {
    email: 'secretary@autoecole.com',
    password: await bcrypt.hash('secretary123', 10),
    role: 'SECRETARY',
    tenantId: tenant.id,
  },
});
```

Puis :

```bash
docker exec -it autoecole-backend npm run db:seed
```

---

## ✅ Checklist de Test

- [ ] Login ADMIN fonctionne
- [ ] ADMIN peut accéder à `/auth/admin-only`
- [ ] ADMIN peut accéder à `/auth/admin-or-secretary`
- [ ] SECRETARY peut accéder à `/auth/admin-or-secretary`
- [ ] SECRETARY ne peut PAS accéder à `/auth/admin-only`
- [ ] INSTRUCTOR ne peut accéder à aucune route RBAC
- [ ] STUDENT ne peut accéder à aucune route RBAC
- [ ] Tous peuvent accéder à `/auth/me`

---

## 🎯 Résumé

Le système RBAC est **opérationnel** :
- ✅ Enum Role créé
- ✅ JWT contient le rôle
- ✅ JwtAuthGuard fonctionne
- ✅ RolesGuard implémenté
- ✅ @Roles decorator disponible
- ✅ Routes d'exemple fonctionnent

**Prêt pour Sprint 1 !** 🚀
