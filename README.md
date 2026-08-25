# CodeAnalyzer AI

Static intelligence platform providing AST graph visualization, time/space complexity analysis, dead code detection, and optimization scoring for Python code.

---

## Repository Structure

```
codeanalyzer/
├── backend/
│   ├── app.py                  # Active Flask application entry point
│   ├── analyzer/               # Python AST analyzer & Redis cache
│   │   ├── __init__.py
│   │   ├── ast_parser.py
│   │   ├── cache.py
│   │   ├── complexity.py
│   │   └── utils.py
│   └── tests/                  # Backend test suite & samples
│       ├── comprehensive_test.py
│       ├── sample.py
│       └── test.py
│
├── frontend/
│   ├── src/                    # React 18 + TypeScript 5 SPA
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── Dockerfile                  # Multi-stage build (Node.js -> Python runtime)
├── docker-compose.yml          # Container orchestration (Flask + Redis)
├── .dockerignore
├── .gitignore
├── .env.example
├── README.md
└── requirements.txt
```

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

#### Frontend Setup
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

## Running with Docker

### Build and Start Containers

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
