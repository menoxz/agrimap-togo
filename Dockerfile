# ─── Stage 1 : Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ─── Stage 2 : Serve ─────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Copie les fichiers buildés
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Config nginx SPA + gzip
COPY deploy/nginx-docker.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
