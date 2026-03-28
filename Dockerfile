# ──────────────────────────────────────────────────
# VitalCoach — Dockerfile
# Stage 1: build React frontend
# Stage 2: compile backend TypeScript
# Stage 3: run backend (serves API + static frontend)
# ──────────────────────────────────────────────────

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY app/package.json app/package-lock.json* ./
RUN npm ci --legacy-peer-deps --ignore-scripts
COPY app/ .
RUN npm run build

# Stage 2: Compile backend TypeScript
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Backend compiled output
COPY --from=backend-build /app/dist ./dist

# Frontend build → served as static files by the backend
COPY --from=frontend /frontend/dist ./public

# widget.html is read at startup by server.ts
COPY widget.html ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
