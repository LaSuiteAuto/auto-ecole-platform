# 🧪 Tests API - Guide Rapide

Scripts PowerShell pour tester l'API d'authentification facilement.

## 📋 Prérequis

Le backend doit être démarré :
```powershell
docker compose up -d
```

---

## ✅ Tests Manuels PowerShell

### 1. Test Register (Inscription)

```powershell
$body = @{
    tenantName = 'Mon Auto École'
    email = 'mon.email@test.fr'
    password = 'Password123!'
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3000/auth/register' `
    -Method POST `
    -Body $body `
    -ContentType 'application/json' `
    -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Résultat attendu :**
```json
{
  "access_token": "eyJhbG...",
  "user": {
    "id": "...",
    "email": "mon.email@test.fr",
    "role": "ADMIN",
    "tenantId": "..."
  }
}
```

---

### 2. Test Login (Connexion)

```powershell
$body = @{
    email = 'mon.email@test.fr'
    password = 'Password123!'
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3000/auth/login' `
    -Method POST `
    -Body $body `
    -ContentType 'application/json' `
    -UseBasicParsing

$data = $response.Content | ConvertFrom-Json
$data

# Sauvegarder le token pour les prochains tests
$token = $data.access_token
Write-Host "Token sauvegardé: $token" -ForegroundColor Green
```

---

### 3. Test Me (Utilisateur connecté)

```powershell
# Utiliser le token du login précédent
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-WebRequest -Uri 'http://localhost:3000/auth/me' `
    -Method GET `
    -Headers $headers `
    -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Résultat attendu :**
```json
{
  "id": "...",
  "email": "mon.email@test.fr",
  "role": "ADMIN",
  "tenantId": "...",
  "createdAt": "2026-01-13T..."
}
```

---

## 🔄 Script Complet (Workflow complet)

Copier-coller ce script pour tester tout le workflow :

```powershell
Write-Host "=== Test Authentification Auto-École Platform ===" -ForegroundColor Cyan

# 1. Register
Write-Host "`n1️⃣ Test Register..." -ForegroundColor Yellow
$registerBody = @{
    tenantName = 'Auto École Test'
    email = "test_$(Get-Random)@test.fr"
    password = 'Password123!'
} | ConvertTo-Json

try {
    $registerResponse = Invoke-WebRequest -Uri 'http://localhost:3000/auth/register' `
        -Method POST `
        -Body $registerBody `
        -ContentType 'application/json' `
        -UseBasicParsing
    
    $registerData = $registerResponse.Content | ConvertFrom-Json
    Write-Host "✅ Register réussi!" -ForegroundColor Green
    Write-Host "Email: $($registerData.user.email)" -ForegroundColor Gray
    Write-Host "Role: $($registerData.user.role)" -ForegroundColor Gray
    
    $email = $registerData.user.email
    $token = $registerData.access_token
} catch {
    Write-Host "❌ Erreur Register: $_" -ForegroundColor Red
    exit
}

# 2. Login
Write-Host "`n2️⃣ Test Login..." -ForegroundColor Yellow
$loginBody = @{
    email = $email
    password = 'Password123!'
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri 'http://localhost:3000/auth/login' `
        -Method POST `
        -Body $loginBody `
        -ContentType 'application/json' `
        -UseBasicParsing
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    Write-Host "✅ Login réussi!" -ForegroundColor Green
    $token = $loginData.access_token
} catch {
    Write-Host "❌ Erreur Login: $_" -ForegroundColor Red
    exit
}

# 3. Me
Write-Host "`n3️⃣ Test /me..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $meResponse = Invoke-WebRequest -Uri 'http://localhost:3000/auth/me' `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing
    
    $meData = $meResponse.Content | ConvertFrom-Json
    Write-Host "✅ /me réussi!" -ForegroundColor Green
    Write-Host "User ID: $($meData.id)" -ForegroundColor Gray
    Write-Host "Email: $($meData.email)" -ForegroundColor Gray
    Write-Host "Role: $($meData.role)" -ForegroundColor Gray
    Write-Host "Tenant ID: $($meData.tenantId)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erreur /me: $_" -ForegroundColor Red
    exit
}

Write-Host "`n🎉 Tous les tests sont passés avec succès!" -ForegroundColor Green
```

---

## 🧪 Tests d'Erreurs

### Email déjà utilisé (409)

```powershell
# S'inscrire deux fois avec le même email
$body = @{
    tenantName = 'Test'
    email = 'duplicate@test.fr'
    password = 'Password123!'
} | ConvertTo-Json

# Premier appel : succès
Invoke-WebRequest -Uri 'http://localhost:3000/auth/register' `
    -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing

# Deuxième appel : devrait échouer avec 409
try {
    Invoke-WebRequest -Uri 'http://localhost:3000/auth/register' `
        -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
} catch {
    Write-Host "Erreur attendue (409): $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}
```

### Mot de passe incorrect (401)

```powershell
$body = @{
    email = 'test@test.fr'
    password = 'MauvaisPassword'
} | ConvertTo-Json

try {
    Invoke-WebRequest -Uri 'http://localhost:3000/auth/login' `
        -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
} catch {
    Write-Host "Erreur attendue (401): $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}
```

### Token invalide (401)

```powershell
$headers = @{
    Authorization = "Bearer token_invalide"
}

try {
    Invoke-WebRequest -Uri 'http://localhost:3000/auth/me' `
        -Method GET -Headers $headers -UseBasicParsing
} catch {
    Write-Host "Erreur attendue (401): $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}
```

### Validation échouée (400)

```powershell
# Mot de passe trop court
$body = @{
    tenantName = 'Test'
    email = 'test@test.fr'
    password = 'short'
} | ConvertTo-Json

try {
    Invoke-WebRequest -Uri 'http://localhost:3000/auth/register' `
        -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
} catch {
    Write-Host "Erreur attendue (400 - validation): $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}
```

---

## 📊 Vérifier en Base de Données

Après les tests, vérifier que les données sont bien créées :

```powershell
# Ouvrir Prisma Studio
npm run db:studio
```

Puis dans le navigateur : http://localhost:5555

Vérifier :
- ✅ Tenant créé
- ✅ User créé avec mot de passe hashé
- ✅ Role = ADMIN

---

## 🐛 Debugging

### Voir les logs backend

```powershell
docker compose logs backend -f
```

### Tester que le backend répond

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing
```

### Vérifier la base de données

```powershell
docker exec -it autoecole-db psql -U autoecole -d autoecole -c "SELECT * FROM \"User\";"
```

---

## 📝 Notes

- Les tokens JWT expirent après **7 jours**
- Les mots de passe sont hashés avec **bcrypt (10 rounds)**
- Le logout se fait **côté client** (suppression du token)
- Tous les endpoints sauf `/auth/me` sont **publics**

---

## 🎯 Prochaines étapes

Une fois que tous les tests passent :

1. ✅ Intégrer au frontend (React/Next.js)
2. ✅ Implémenter le stockage du token (localStorage)
3. ✅ Créer les guards de route (protection pages)
4. ✅ Ajouter les tests automatisés (Jest/Supertest)

---

**Happy Testing! 🚀**
