# ==========================================
# Dockerfile - NestJS Backend
# ==========================================

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies needed for compiling prisma and node-gyp if any
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS application
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl

COPY package*.json ./
# Install only production dependencies
RUN npm ci --only=production

# Copy compiled code and prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Copy generated Prisma Client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

ENV NODE_ENV=production
ENV PORT=4000
ENV NODE_OPTIONS="--max-old-space-size=512"

EXPOSE 4000
CMD ["node", "dist/main"]
