# Indemlia SaaS POC - Backend API

**Lancez le POC en 5 minutes sur Mac.**

## Prérequis

- **Docker Desktop** (Mac Intel ou Apple Silicon)
- **Git**

## Installation & Lancement

### 1. Clone le repo
```bash
git clone https://github.com/kenzab75-bit/indemlia-saas-poc.git
cd indemlia-saas-poc
```

### 2. Lance Docker Compose
```bash
docker-compose up --build
```

**Attends 30-60 secondes** le temps que PostgreSQL démarre et que les migrations s'exécutent.

Quand tu vois `✅ Server running on http://localhost:3001`, c'est prêt.

### 3. Teste les endpoints

Ouvre un **nouveau terminal** et teste :

#### Créer un compte
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@indemlia.com",
    "password": "Test1234!",
    "firstName": "Jean",
    "lastName": "Dupont",
    "phone": "+33612345678"
  }'
```

**Réponse attendue :**
```json
{
  "id": "uuid-here",
  "email": "test@indemlia.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "role": "VICTIME",
  "createdAt": "2026-02-04T..."
}
```

#### Se connecter
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@indemlia.com",
    "password": "Test1234!"
  }'
```

**Réponse attendue :**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "test@indemlia.com",
    "role": "VICTIME"
  }
}
```

**Copie l'`accessToken` pour les prochaines requêtes.**

#### Créer un dossier
```bash
curl -X POST http://localhost:3001/dossiers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "titre": "Accident voiture 2026",
    "dateAccident": "2026-01-15T10:30:00Z",
    "lieuAccident": "Paris, Rue de Rivoli",
    "descriptionAccident": "Collision avec un autre véhicule"
  }'
```

#### Vérifier la santé du serveur
```bash
curl http://localhost:3001/health
```

**Réponse attendue :**
```json
{
  "status": "ok",
  "timestamp": "2026-02-04T13:20:00.000Z"
}
```

## Arrêter les services

```bash
docker-compose down
```

## Problèmes courants

### "Connection refused" sur port 3001
- Attends 30 secondes après `docker-compose up --build`
- Vérifie que Docker Desktop est bien lancé

### "Database connection error"
- Redémarre les services : `docker-compose down && docker-compose up --build`

### "Invalid token" sur les endpoints protégés
- Assure-toi que tu passes l'`accessToken` dans le header `Authorization: Bearer <token>`

## Structure du projet

```
backend/
├── src/
│   ├── index.ts           # Point d'entrée
│   ├── app.ts             # Configuration Express
│   ├── middleware/
│   │   ├── auth.ts        # JWT middleware
│   │   └── errorHandler.ts
│   └── routes/
│       ├── auth.routes.ts
│       ├── dossier.routes.ts
│       ├── document.routes.ts
│       ├── status.routes.ts
│       └── audit.routes.ts
├── prisma/
│   └── schema.prisma      # Modèle de données
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Endpoints disponibles

### Auth
- `POST /auth/register` - Créer un compte
- `POST /auth/login` - Se connecter
- `POST /auth/refresh` - Renouveler le token

### Dossiers (protégés)
- `POST /dossiers` - Créer un dossier
- `GET /dossiers` - Lister ses dossiers
- `GET /dossiers/:id` - Détails d'un dossier
- `PATCH /dossiers/:id` - Modifier un dossier

### Documents (protégés)
- `POST /dossiers/:dossierId/documents` - Upload un document
- `GET /dossiers/:dossierId/documents` - Lister les documents
- `DELETE /documents/:id` - Supprimer un document

### Statuts (protégés)
- `POST /dossiers/:id/status` - Changer le statut
- `GET /dossiers/:id/status-history` - Historique des statuts

### Audit (admin only)
- `GET /logs` - Consulter les logs d'audit

### Health
- `GET /health` - Vérifier la santé du serveur

## Environnement

Les variables d'environnement sont définies dans `docker-compose.yml` :
- `DATABASE_URL` - PostgreSQL
- `JWT_SECRET` - Clé secrète (change en production)
- `NODE_ENV` - development/production

## Prochaines étapes

1. Connecte ce POC à ton repo GitHub
2. Teste les endpoints avec Postman ou Insomnia
3. Déploie en staging (Render, Railway, etc.)
4. Intègre Airtable, Make, SendGrid

---

**Questions ?** Contacte l'équipe Indemlia.
