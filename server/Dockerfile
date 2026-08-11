FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

FROM deps AS build

COPY nest-cli.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY scripts ./scripts
COPY drizzle ./drizzle
COPY src ./src

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV PORT=4000
ENV NODE_OPTIONS=--max-old-space-size=512

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/drizzle ./drizzle

RUN mkdir -p public/avatars/user public/avatars/workspace \
  && chown -R node:node /app/public

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
