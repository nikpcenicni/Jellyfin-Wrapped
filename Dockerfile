# Multi-stage build for Next.js and Node.js backend

# Stage 1: Build Next.js frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
COPY next.config.js postcss.config.js tailwind.config.js tsconfig.json ./
COPY app/ ./app/
COPY messages/ ./messages/
COPY public/ ./public/
RUN npm install
RUN npm run build

# Stage 2: Install backend dependencies
FROM node:20-alpine AS backend-deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Stage 3: Final image
FROM node:20-alpine
WORKDIR /app

# Install nginx and dumb-init for proper signal handling
RUN apk add --no-cache nginx dumb-init

# Copy backend files and dependencies
COPY --from=backend-deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY package*.json ./

# Copy Next.js standalone build
# Standalone output includes the full structure with server.js at root
COPY --from=frontend-builder /app/.next/standalone ./

# Copy static files - Next.js standalone expects them at .next/static relative to server.js
COPY --from=frontend-builder /app/.next/static ./.next/static

# Create public directory (will be empty if no public folder exists in source)
RUN mkdir -p ./public
# Copy public directory if it exists (standalone mode should handle this, but we ensure it's there)
# Note: If public folder doesn't exist in source, this will just leave an empty directory

# Copy nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Environment variables (should be provided via docker-compose or runtime)
# Note: PORT and NEXT_PORT are hardcoded in docker-entrypoint.sh and nginx.conf for internal routing

# Expose port (nginx will handle routing)
EXPOSE 80

# Start all services using dumb-init
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
