# CodeAnalyzer AI

Static intelligence platform providing AST graph visualization, time/space complexity analysis, dead code detection, and optimization scoring for Python code.

---

## Technical Stack

- **Frontend**: React 18, TypeScript 5, Vite, Monaco Editor (`@monaco-editor/react`), React Flow (`reactflow`), Dagre graph layout (`dagre`).
- **Backend**: Python 3.11, Flask, Gunicorn.
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
python app.py
```
The Flask backend will start on `http://127.0.0.1:5000`.

#### Frontend Development Server (Optional)
```bash
# Install npm dependencies
npm install

# Build production bundle (or start Vite dev server)
npm run build

# Start Vite dev server with proxy to Flask
npm run dev
```

---

## Running with Docker

### Build and Start Containers

To build and run the entire application inside Docker:

```bash
docker compose up -d --build
```

Access the application in your browser at:
`http://localhost:5000`

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
