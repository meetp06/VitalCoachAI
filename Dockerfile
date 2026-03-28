# ──────────────────────────────────────────────────
# VitalCoach — Dockerfile
# Multi-stage build: compile TypeScript → serve with
# lightweight Node.js server for DigitalOcean deploy.
# ──────────────────────────────────────────────────

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY app/package.json app/package-lock.json* ./
RUN npm ci --legacy-peer-deps --ignore-scripts

COPY app/ .
RUN npm run build

# Stage 2: Serve
FROM node:20-alpine AS runner
WORKDIR /app

# Install a simple static file server
RUN npm install -g serve@14

# Copy built files
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:3000/ || exit 1

# Start
CMD ["serve", "-s", "dist", "-l", "3000"]
