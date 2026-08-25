# CodeAnalyzer AI

Static intelligence platform providing AST graph visualization, time/space complexity analysis, dead code detection, optimization scoring, user authentication, and analysis history for Python code.

---

## Technical Stack

- **Frontend**: React 18, TypeScript 5, Vite, Monaco Editor (`@monaco-editor/react`), React Flow (`reactflow`), Socket.IO client (`socket.io-client`).
- **Backend**: Python 3.11, Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-SocketIO, Gunicorn.
- **Database & Cache**: PostgreSQL 16, Redis 7.
- **Containerization**: Multi-stage Docker, Docker Compose.

---

## Getting Started

### 1. Environment Setup

Copy `.env.example` to create your local environment file:

```bash
cp .env.example .env
```

### 2. Local Development (Without Docker)

#### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run Flask backend server
python backend/app.py
```
The Flask backend will start on `http://127.0.0.1:5000`.

#### Database Migrations (Flask-Migrate)
```bash
# Initialize / update database tables
python -m flask db upgrade --directory backend/migrations
```

#### Frontend Development Server
```bash
cd frontend

# Install npm dependencies
npm install

# Build production SPA bundle
npm run build

# Start Vite dev server with proxy to Flask
npm run dev
```

---

## Running with Docker & PostgreSQL

### Build and Start Containers

To build and run the entire application (Flask, React, PostgreSQL, Redis) inside Docker:

```bash
docker compose up -d --build
```

Access the application in your browser at:
`http://localhost:5001`

### View Container Logs

```bash
docker compose logs -f
```

### Stop Docker Containers

```bash
docker compose down
```

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Container web server port | `5000` |
| `FLASK_ENV` | Environment mode (`development` / `production`) | `production` |
| `SECRET_KEY` | Flask session secret key | `change-this-in-production-secret-key` |
| `REDIS_HOST` | Redis cache hostname | `localhost` |
| `REDIS_PORT` | Redis cache port | `6379` |
| `REDIS_TTL` | Cache time-to-live (seconds) | `3600` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://codeanalyzer:codeanalyzer_pass@db:5432/codeanalyzer_db` |
| `POSTGRES_USER` | PostgreSQL username | `codeanalyzer` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `codeanalyzer_pass` |
| `POSTGRES_DB` | PostgreSQL database name | `codeanalyzer_db` |
