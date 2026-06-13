# Treckin — Smart Event Check-in System (University Edition)

Treckin is a high-concurrency, real-time, multi-board event check-in platform designed for universities. It features anti-fraud dynamic QR codes, geofencing validation, and offline check-in caching with bulk synchronization.

## 🚀 Tech Stack

- **Frontend**: React 19 (Vite), TypeScript, Tailwind CSS, Zustand, Socket.io-client.
- **Backend**: NestJS (Fastify platform), Prisma ORM, PostgreSQL, ioredis, Socket.io.
- **Services**: PostgreSQL (Database), Redis (Real-time socket adapter & cache).

---

## 📂 Project Structure

```text
├── server/                    # NestJS Backend Application
│   ├── src/                   # NestJS source code
│   ├── prisma/                # Prisma ORM schema & migrations
│   ├── Dockerfile             # Multi-stage production build for Backend
│   └── package.json           # Backend dependencies
├── src/                       # React Frontend Application (Vite)
│   ├── components/            # Reusable UI components
│   ├── pages/                 # Full pages (Login, Student/Staff Dashboards)
│   ├── stores/                # Zustand state management
│   └── types/                 # Core TypeScript declarations
├── Dockerfile                 # Production Dockerfile for Frontend (served via Nginx)
├── nginx.conf                 # Nginx proxy & static server configuration
├── docker-compose.yml         # Production/Hosting configuration (with RAM optimizations)
├── docker-compose.dev.yml     # Lightweight configuration for local development services
└── package.json               # Frontend dependencies & root scripts
```

---

## 🛠️ Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Docker](https://www.docker.com/) & Docker Compose

---

### 1. Development Environment (Hybrid Mode - Recommended)

To save memory and keep development fast with instant hot-reload, run database and cache services in Docker, and run application code directly on your local machine.

#### Step 1: Start PostgreSQL and Redis in Docker

Start the database and cache containers in the background:

```bash
docker compose -f docker-compose.dev.yml up -d
```

_This starts Postgres on port `5432` (password: `password`, database: `treckin_db`) and Redis on port `6379`._

#### Step 2: Set up and run the Backend

1. Go to the `server` directory and copy environment variables:
   ```bash
   cd server
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```
4. Start NestJS in watch mode:
   ```bash
   npm run start:dev
   ```

#### Step 3: Set up and run the Frontend

1. Return to the root directory and copy environment variables:
   ```bash
   cd ..
   cp .env.example .env.local
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 2. Production Environment (Full-stack Docker Compose)

To deploy the entire stack to a VPS or hosting environment, run:

```bash
docker compose up -d --build
```

#### What this does:

1. **Frontend Compilation**: Builds React app into static files and serves them via Nginx Alpine on port `80`.
2. **Backend Compilation**: Builds NestJS backend into Javascript (`dist/main.js`) and runs under Node.js production mode.
3. **Database & Cache**: Bootstraps PostgreSQL and Redis containers with persistent volumes.
4. **Nginx Reverse Proxy**: Single entrypoint on port `80`. Requests to `/api` and `/socket.io` are automatically proxied to the Backend container, while all other requests serve the React Frontend.

---

## ⚡ Memory & Performance Optimizations (For Hosting)

To allow deployment on low-spec VPS (e.g. 1GB or 2GB RAM), the following optimizations are applied:

- **Frontend Served via Nginx**: Instead of running a Node.js process to serve Vite in production (which eats ~150-200MB RAM), the frontend is built into static assets and served using Nginx. This reduces RAM footprint to just **5-15MB** and is extremely fast.
- **Node.js RAM Limit**: Backend container runs with `--max-old-space-size=512` in `NODE_OPTIONS` to trigger garbage collection earlier, keeping Node.js memory footprint under **512MB**.
- **PostgreSQL Tuning**: Configured with constrained resources:
  - `max_connections = 50` (limits worker process spawn count).
  - `shared_buffers = 128MB` (keeps cache buffer footprint small).
  - `work_mem = 4MB`.
- **Redis Memory Capping**: Configured with a `maxmemory 128mb` ceiling and `allkeys-lru` eviction policy, preventing Redis from consuming all available system memory.
- **Docker Resource Limits**: Memory limits are enforced at the docker-compose level for each service, avoiding memory leaks from taking down the host system.
