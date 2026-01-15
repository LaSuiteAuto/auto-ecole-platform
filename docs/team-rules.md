# Charte d’équipe — Projet Startup Auto-École

## 1. Vision commune
Nous construisons un produit professionnel destiné à des clients réels. Même sans revenus immédiats, nous travaillons comme une entreprise : qualité, cohérence, long terme.

## 2. Rôles et responsabilités
Même si nous sommes tous développeurs, les rôles existent.

### Product Owner (PO)
- vision produit
- priorités du backlog
- décisions fonctionnelles
- arbitrage des désaccords fonctionnels

### Tech Lead
- architecture technique
- décisions techniques structurantes
- qualité du code et dette technique

### Développeur
- implémentation des features
- tests
- documentation liée au code

## 3. Règles de travail (non négociables)
- Pas de travail sans ticket.
- Pas de code sans objectif métier.
- Qualité avant vitesse.
- Toute décision importante doit être écrite.
- Une feature peut être supprimée ou refaite : pas d’ego.
- Prisma est toujours exécuté dans le container backend. Aucune commande Prisma n’est lancée en local.
### 🔒 Règles Multi-Tenant (SÉCURITÉ CRITIQUE)

**Toute requête DB DOIT être filtrée par `tenantId`. Aucune exception.**

#### ❌ INTERDIT

```typescript
// DANGER : Récupère TOUS les étudiants de TOUTES les auto-écoles
await prisma.student.findMany();

// DANGER : Mise à jour sans filtre
await prisma.student.update({
  where: { id },
  data: { name }
});

// DANGER : Suppression sans filtre
await prisma.student.delete({ where: { id } });
```

#### ✅ OBLIGATOIRE

```typescript
// CORRECT : Filtré par tenantId
await prisma.student.findMany({
  where: { tenantId }
});

// CORRECT : Vérification du tenant avant mise à jour
await prisma.student.update({
  where: { 
    id,
    tenantId  // ← OBLIGATOIRE
  },
  data: { name }
});

// CORRECT : Vérification du tenant avant suppression
await prisma.student.delete({
  where: { 
    id,
    tenantId  // ← OBLIGATOIRE
  }
});
```

#### 📋 Checklist avant chaque requête Prisma

- [ ] La requête filtre par `tenantId` ?
- [ ] Le `tenantId` vient de `req.user` (authentifié) ?
- [ ] Le guard `TenantGuard` est appliqué sur la route ?
- [ ] Les tests vérifient l'isolation des données ?

#### 🛡️ Guards OBLIGATOIRES

Sur TOUTES les routes métier :

```typescript
@Get('students')
@UseGuards(JwtAuthGuard, TenantGuard)  // ← OBLIGATOIRE
async getStudents(@CurrentUser() user: CurrentUserData) {
  return this.service.findAll({ tenantId: user.tenantId });
}
```

Ordre des guards :
1. `JwtAuthGuard` - Authentifie et charge `req.user`
2. `TenantGuard` - Vérifie `req.user.tenantId` existe
3. `RolesGuard` - Vérifie les permissions (optionnel)

#### ⚠️ Conséquences en cas de non-respect

- **Fuite de données** entre auto-écoles
- **Violation RGPD**
- **Perte de confiance client**
- **Responsabilité légale**

**Cette règle n'a AUCUNE exception. Si vous avez un doute, demandez en code review.**

---
## 4. Organisation du travail
- Sprints de 2 semaines.
- Objectifs clairs par sprint.
- Démo réelle à la fin.

Rituels obligatoires :
- Sprint Planning (≈ 1h)
- Sprint Review (30–45 min)
- Rétrospective (30 min)

## 5. Git & collaboration
- Branches : `main` (stable), `dev` (intégration), `feature/*`.
- Pull Requests obligatoires, au moins 1 review.
- Pas de push direct sur `main`.
- Commits clairs : `feat: ...`, `fix: ...`, `chore: ...`.

## 6. Communication
- Canal principal : Discord.
- Canaux séparés : #dev, #product, #decisions.
- Les décisions importantes doivent être documentées.

## 7. Gestion des désaccords
- Discussion factuelle.
- Si blocage : PO tranche (fonctionnel) / Tech Lead tranche (technique).

## 8. Engagement
- Respect du temps et transparence sur la charge.
- Prévenir en cas d’indisponibilité.
- Ambiance saine.

## 9. Évolution
Cette charte évolue par décision collective et trace écrite.
