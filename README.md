# CardVault AI

A mobile-first sports and trading card collection manager. Upload card photos, let Claude Vision identify them, review AI suggestions, and track eBay market prices — all in one place.

**Stack:** React + Vite (frontend) · Cloudflare Workers + D1 + R2 (backend) · Claude claude-sonnet-4-5 Vision (card identification) · eBay HTML scraping (comps)

---

## Local dev setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/card-vault-ai.git
cd card-vault-ai
npm install          # installs all workspace dependencies
```

### 2. Configure environment

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```
VITE_API_URL=http://localhost:8787
```

For the backend, create `backend/.dev.vars` (gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Apply database migrations

```bash
# Local D1 database (wrangler creates it automatically on first run)
cd backend
npx wrangler d1 execute card-vault-ai --local --file=migrations/0001_init.sql
npx wrangler d1 execute card-vault-ai --local --file=migrations/0002_vision.sql
```

### 4. Run both servers

```bash
# From the repo root — starts backend (port 8787) and frontend (port 5173) concurrently
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Cloudflare setup checklist

Before deploying for the first time, complete these steps once:

### D1 database

```bash
cd backend
npx wrangler d1 create card-vault-ai
```

Copy the printed `database_id` into `backend/wrangler.toml`:

```toml
[[d1_databases]]
binding      = "DB"
database_name = "card-vault-ai"
database_id  = "paste-your-id-here"
```

Apply migrations to the remote database:

```bash
npx wrangler d1 execute card-vault-ai --remote --file=migrations/0001_init.sql
npx wrangler d1 execute card-vault-ai --remote --file=migrations/0002_vision.sql
```

### R2 bucket

```bash
npx wrangler r2 bucket create card-vault-ai-images
```

Confirm the bucket name matches `wrangler.toml`:

```toml
[[r2_buckets]]
binding     = "BUCKET"
bucket_name = "card-vault-ai-images"
```

### Secrets

```bash
npx wrangler secret put ANTHROPIC_API_KEY
# paste your Anthropic API key when prompted
```

### Cloudflare Pages project

Create the project once in the dashboard or via CLI:

```bash
npx wrangler pages project create card-vault-ai
```

Update `CORS_ORIGIN` in `wrangler.toml` to your Pages URL:

```toml
[vars]
CORS_ORIGIN = "https://card-vault-ai.pages.dev"
```

### GitHub Actions secrets

Add these in your repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers + Pages + D1 + R2 edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

Optionally add a **variable** (not secret):

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your deployed Worker URL, e.g. `https://card-vault-ai.your-subdomain.workers.dev` |

---

## Environment variables reference

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8787` | Base URL for API calls. Set to the Worker URL in production. Leave empty to use the Vite dev proxy (`/api → localhost:8787`). |

### Backend (`backend/.dev.vars` in dev, Wrangler secrets in prod)

| Variable | Where | Description |
|----------|-------|-------------|
| `ANTHROPIC_API_KEY` | Secret | Anthropic API key used by Claude Vision for card identification. |
| `CORS_ORIGIN` | `wrangler.toml [vars]` | Allowed frontend origin for CORS. Set to your Pages URL in production. |

### Wrangler bindings (`backend/wrangler.toml`)

| Binding | Type | Description |
|---------|------|-------------|
| `DB` | D1 | SQLite database — users, cards, collection items, comps, grading results. |
| `BUCKET` | R2 | Object storage — card images uploaded via the upload flow. |

---

## Project structure

```
card-vault-ai/
├── backend/                  Cloudflare Worker
│   ├── migrations/           SQL schema files
│   ├── src/
│   │   ├── index.ts          Request router
│   │   ├── lib/              auth, db, comps, vision, grading helpers
│   │   └── routes/           auth, cards, collection, comps, grading, uploads, vision
│   └── wrangler.toml
├── frontend/                 Vite + React SPA
│   ├── public/               Static assets + _redirects
│   └── src/
│       ├── components/       CardTile, Layout, ProtectedRoute
│       ├── hooks/            useAuth
│       ├── lib/api.ts        Typed axios client
│       └── pages/            Dashboard, Upload, Review, CardDetail, Login, Register
└── .github/workflows/        CI/CD deploy pipeline
```

---

## Key features

| Feature | Implementation |
|---------|---------------|
| **Card identification** | Claude claude-sonnet-4-5 Vision via Anthropic Messages API — player, year, set, card number, sport, variation, condition notes |
| **Review queue** | Pending identifications stored in D1; user confirms/edits AI suggestions before cards enter collection |
| **eBay comps** | HTML scraping of sold + active listings; 24 h cache per card; `GET /api/comps/search?q=` for pre-confirmed items |
| **AI grading** | Claude analyzes centering, corners, edges, surface; returns 0–10 scores with grade range estimate |
| **Auth** | Session-based (cookie) auth with D1-backed sessions; bcrypt-style password hashing |
