# Stage 1: Build React + TypeScript frontend using Node.js 20
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src

RUN npm run build

# Stage 2: Serve application using Python 3.11 & Gunicorn
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy compiled React frontend build from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Copy Python backend modules and templates
COPY analyzer ./analyzer
COPY templates ./templates
COPY static ./static
COPY app.py ./

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
