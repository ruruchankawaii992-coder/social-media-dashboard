# Social Media Dashboard

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker)

A comprehensive dashboard for monitoring and analyzing social media performance across multiple platforms, with real-time metrics, audience insights, and content scheduling capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │   Frontend        │  │   Backend API    │            │
│  │   React + Vite    │──│   Express/Node   │            │
│  │   Port 3000       │  │   Port 4000      │            │
│  └──────────────────┘  └────────┬─────────┘            │
│                                 │                       │
│                        ┌────────▼─────────┐            │
│                        │   PostgreSQL     │            │
│                        │   Port 5432      │            │
│                        └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Recharts            |
| Backend    | Node.js 20, Express, TypeScript, ws, JWT        |
| Database   | PostgreSQL 16                                   |
| Infra      | Docker Compose, Nginx                           |

### Services

| Service   | Port | Description                            |
|-----------|------|----------------------------------------|
| Frontend  | 3000 | React SPA served via Nginx             |
| Backend   | 4000 | Express API + WebSocket server         |
| Postgres  | 5432 | Primary database                       |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (v2)
- Node.js 20+ (for local development without Docker)

## Quick Start

```bash
# Start all services
docker compose up --build

# Or run in detached mode
docker compose up --build -d
```

Once running:

- **Frontend**: http://localhost:3000
- **Backend health**: http://localhost:4000/api/health
- **Database**: localhost:5432 (user: `dashboard`, password: `dashboard`, db: `social_dashboard`)

## Development Setup

For development without Docker (faster iteration):

### 1. Start PostgreSQL

```bash
docker compose up postgres -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend starts on http://localhost:4000 with hot-reload via `ts-node-dev`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The frontend starts on http://localhost:5173 with Vite HMR. The Vite dev server proxies `/api` and `/ws` to the backend at `localhost:4000`.

## Project Structure

```
social-media-dashboard/
├── shared/                  # Shared TypeScript types and contracts
│   ├── types.ts             # Core interfaces (User, Post, MetricSnapshot, etc.)
│   ├── api.ts               # API route definitions
│   ├── websocket.ts         # WebSocket message payload types
│   ├── constants.ts         # Shared constants (ports, mock credentials, colors)
│   └── validation.ts        # Validation helpers
├── frontend/                # React + Vite SPA
│   ├── src/                 # Application source
│   ├── Dockerfile           # Multi-stage build (node → nginx)
│   ├── nginx.conf           # Nginx SPA config with API proxy
│   └── package.json
├── backend/                 # Express + TypeScript API
│   ├── src/                 # Application source
│   ├── Dockerfile           # Node production build
│   └── package.json
├── docker-compose.yml       # Orchestrates all services
└── README.md
```

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Description                          | Default                                        |
|----------------|--------------------------------------|------------------------------------------------|
| `PORT`         | Express server port                   | `4000`                                         |
| `WS_PORT`      | WebSocket server port                 | `4001`                                         |
| `DATABASE_URL` | PostgreSQL connection string          | `postgresql://dashboard:dashboard@postgres:5432/social_dashboard` |
| `JWT_SECRET`   | Secret key for JWT signing            | `change-me-in-production`                      |
| `NODE_ENV`     | Environment mode                      | `development`                                  |

### Frontend (`frontend/.env`)

| Variable        | Description              | Default                 |
|-----------------|--------------------------|-------------------------|
| `VITE_API_URL`  | Backend API base URL     | `http://localhost:4000` |

## Mock Credentials

- **Username**: `admin`
- **Password**: `password123`

## GitHub Repository

- **Repository URL**: `https://github.com/ruruchankawaii992-coder/social-media-dashboard`
- **Portfolio Integration**: Live at [https://ruruchankawaii992-coder.github.io/single-html-page/](https://ruruchankawaii992-coder.github.io/single-html-page/)

## Deployment

### GitHub Pages
The main portfolio is deployed via GitHub Pages from the `single-html-page` repository. The Social Media Dashboard card links to this repository.

### Docker Deployment
For production deployment to a VPS:

```bash
# Clone the repository
git clone https://github.com/ruruchankawaii992-coder/social-media-dashboard.git
cd social-media-dashboard

# Create production .env file
cp .env.example .env
# Edit .env with production secrets

# Start services
docker compose up --build -d
```

## Branch Strategy

- `main` — Production-ready code
- Feature branches follow: `feature/<name>`
- Pull requests required for merges to `main`

## License

MIT
