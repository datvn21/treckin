# Treckin - Smart Event Check-in System

Treckin is a high-concurrency, real-time, multi-board event check-in platform for universities. It supports anti-fraud dynamic QR codes, geofence validation, offline check-in caching, and bulk synchronization.

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS, Zustand, Socket.io-client.
- Backend: NestJS on Fastify, Drizzle ORM, PostgreSQL, Redis, Socket.io.
- Runtime: Docker Compose for Postgres, Redis, migration, backend, and Nginx-served frontend.

## Database

- Schema lives in `server/src/database/schema/*.ts`.
- SQL migrations live in `server/drizzle/*.sql`.
- The runtime migration runner is `server/scripts/migrate.mjs`.
- The migration runner is forward-only and idempotent. It records applied files in `__migrations`.

Useful backend commands from `server/`:

```bash
npm run db:generate
npm run db:migrate
npm run db:migrate:dev
npm run db:push
npm run db:studio
```

## Health Probes

The backend exposes:

- `GET /api/health` for liveness.
- `GET /api/health/ready` for readiness with Postgres and Redis checks.

Docker healthchecks use the liveness endpoint. The app-level readiness endpoint is available for orchestrators and uptime monitors.

## Project Structure

```text
server/
  src/
    database/              Drizzle schema and database service
  drizzle/                 Generated SQL migrations
  scripts/migrate.mjs      Runtime migration runner
  Dockerfile               Backend production image
src/                       React frontend source
public/                    Frontend public assets
Dockerfile                 Frontend production image, served by Nginx
nginx.conf                 Static frontend + /api and /socket.io proxy
docker-compose.yml         Production stack
docker-compose.dev.yml     Full local development stack
package.json               Frontend scripts
```

## Development With Docker

Start the full hot-reload stack:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Services:

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api
- Swagger docs: http://localhost:4000/api/docs
- Postgres: `localhost:5432`, user `postgres`, password `password`, database `treckin_db`
- Redis: `localhost:6379`

The `migrate` service runs once before the backend starts:

```bash
docker compose -f docker-compose.dev.yml run --rm migrate
```

Useful dev commands:

```bash
docker compose -f docker-compose.dev.yml logs -f backend frontend
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml down -v
```

## Production With Docker

Build and start the complete stack:

```bash
docker compose up -d --build
```

What starts:

1. `postgres` with a persistent `postgres_data` volume.
2. `redis` with a persistent `redis_data` volume.
3. `migrate`, a one-shot service that runs `node scripts/migrate.mjs`.
4. `backend`, after Postgres, Redis, and migration are healthy/successful.
5. `frontend`, an Nginx container serving Vite static assets and proxying `/api` plus `/socket.io`.

Useful production commands:

```bash
docker compose logs -f migrate backend
docker compose run --rm migrate
docker compose down
docker compose down -v
```

## Production Environment Variables

Set these in `.env` or in your deployment platform:

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me
POSTGRES_DB=treckin_db
JWT_SECRET=change-me
QR_HMAC_SECRET=change-me
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CORS_ORIGIN=http://localhost
LOCAL_STORAGE_BASE_URL=http://localhost
VITE_API_URL=/api
VITE_SOCKET_URL=/
VITE_GOOGLE_CLIENT_ID=
```

For external storage, set `STORAGE_PROVIDER` to `r2` or `cloudinary` and provide the matching credentials from `server/.env.example`.

## Notes

- Production frontend uses same-origin `/api` and `/socket.io` through Nginx.
- Development frontend talks directly to `http://localhost:4000`.
- Uploaded local avatars are stored in the `backend_public` Docker volume in production.
- Use `docker compose down -v` only when you intentionally want to delete local database and upload volumes.
