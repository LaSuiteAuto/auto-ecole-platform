# Product Backlog (priorisé)

## P0 — Fondations & Core Métier (priorité absolue)

### P0.1 Fondations techniques & sécurité
- Authentification (login/logout/reset)
- RBAC (ADMIN / SECRETARY / INSTRUCTOR / STUDENT)
- Multi-tenant (isolation des données)
- Journalisation (audit log)
- Environnements (dev/staging/prod)
- CI (lint + tests + build)

### P0.2 Dossier élève
- CRUD élève + archivage
- Statuts (actif/terminé/archivé)
- Heures achetées/consommées/restantes
- Historique

### P0.3 Planning & séances
- Création séance (conduite/code)
- Déplacement (drag & drop)
- Annulation
- Détection conflits
- Récurrence
- Copie/duplication
- Vue semaine/mois

### P0.4 Moniteurs & véhicules
- CRUD moniteur
- Association moniteur ↔ élèves
- CRUD véhicules
- Disponibilités
- Heures effectuées

### P0.5 Livret d’apprentissage (V1 interne)
- Création livret
- Compétences officielles
- Validation compétences
- Progression élève
- Export PDF

### P0.6 Examens (logique humaine)
- Examens code/conduite
- Éligibilité automatique
- Blocages/alertes
- Historique + résultats

## P1 — Adoption & fluidité

### P1.1 Interface moniteur
- Planning perso
- Liste élèves
- Marquer séance faite/annulée
- Commentaires post-séance
- Stats simples

### P1.2 Interface étudiant
- Planning
- Heures restantes
- Demande changement séance
- Historique séances
- Accès livret

### P1.3 Notifications
- Modifications séances
- Fin de crédit
- Examens

## P2 — Connecteurs (avec auto-écoles partenaires)

### P2.1 ANTS
- Module + architecture connecteur
- Statuts ANTS
- Synchronisation dossiers
- Gestion erreurs / rejets

### P2.2 RdvPermis
- Module connecteur
- Recherche créneaux
- Réservation
- Synchronisation résultats

## P3 — Différenciation & scale

### P3.1 Analytics & dashboards
- Réussite, heures/semaine, indicateurs

### P3.2 Site web auto-généré
- Template vitrine
- Domaine personnalisé
- Formulaire inscription

### P3.3 Paiement & conformité
- Paiement en ligne
- Factures
- NF525 (si encaissement)
- CPF (optionnel)
