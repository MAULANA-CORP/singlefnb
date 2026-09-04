# syntax=docker/dockerfile:1
# Next.js 16 standalone + Prisma 7 — untuk EasyPanel
# Build Method: Dockerfile, Port: 3000

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
RUN npm prune --omit=dev

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL palsu supaya prisma generate jalan saat build.
# Nilai aslinya diinjeksi saat runtime oleh EasyPanel.
ENV DATABASE_URL="postgresql://build:***@localhost:5432/build"
ENV SESSION_SECRET="build-placeholder-minimum-32-characters-long!!"
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma 7: generate + barrel fix (index.ts) + build
RUN npx prisma generate \
  && printf 'export * from "./client";\nexport * from "./enums";\nexport * from "./models";\nexport * from "./commonInputTypes";\n' > src/generated/prisma/index.ts \
  && npx next build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 \
  && mkdir -p /data/uploads && chown -R nextjs:nodejs /data

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
