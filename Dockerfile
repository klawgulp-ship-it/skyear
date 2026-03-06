# ── Stage 1: Build client ─────────────────────────────────
FROM node:20-alpine AS client-build

WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json client/package-lock.json* ./client/
COPY src/shared/ ./src/shared/

WORKDIR /app/client
RUN npm install
COPY client/ ./
COPY src/shared/ ../src/shared/
RUN npm run build

# ── Stage 2: Build server ─────────────────────────────────
FROM node:20-alpine AS server-build

WORKDIR /app
COPY package.json package-lock.json* tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npx tsc -p tsconfig.json

# ── Stage 3: Production ──────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=server-build /app/dist/ ./dist/
COPY --from=client-build /app/client/dist/ ./client/dist/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
