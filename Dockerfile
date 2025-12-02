# ============================================
# STAGE 1: Dependencies
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# ============================================
# STAGE 2: Builder
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ============================================
# STAGE 3: Production
# ============================================
FROM node:22-alpine AS production

RUN addgroup -g 1001 -S nodejs && adduser -S botuser -u 1001

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy built assets
COPY --from=deps --chown=botuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=botuser:nodejs /app/dist ./dist
COPY --from=builder --chown=botuser:nodejs /app/package*.json ./
COPY --from=builder --chown=botuser:nodejs /app/prisma ./prisma

USER botuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
