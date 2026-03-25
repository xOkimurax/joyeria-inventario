# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install pnpm
RUN npm install -g pnpm

COPY frontend/package.json frontend/pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile || pnpm install

COPY frontend/ ./

RUN pnpm build


# Stage 2: Production server
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy backend files
COPY backend/package.json backend/pnpm-lock.yaml* ./backend/

WORKDIR /app/backend
RUN pnpm install --frozen-lockfile || pnpm install --prod

WORKDIR /app
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "index.js"]
