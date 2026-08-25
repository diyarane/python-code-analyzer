# Stage 1: Build React + TypeScript frontend using Node.js 20
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

COPY frontend/tsconfig.json frontend/vite.config.ts frontend/index.html ./
COPY frontend/src ./src

RUN npm run build

# Stage 2: Serve application using Python 3.11 & Gunicorn
FROM python:3.11-slim
WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    PYTHONPATH=/app/backend

COPY requirements.txt ../
RUN pip install --no-cache-dir -r ../requirements.txt

# Copy compiled React frontend build from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ../frontend/dist

# Copy Python backend modules
COPY backend ./

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
