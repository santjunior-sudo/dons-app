# DONS — imagem de produção (processo único, estado em memória + snapshot em disco)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# O nome da igreja entra no bundle no build.
ARG NEXT_PUBLIC_CHURCH_NAME
ARG NEXT_PUBLIC_EVENT_SUBTITLE
ENV NEXT_PUBLIC_CHURCH_NAME=$NEXT_PUBLIC_CHURCH_NAME
ENV NEXT_PUBLIC_EVENT_SUBTITLE=$NEXT_PUBLIC_EVENT_SUBTITLE
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Snapshot da partida: aponte para um volume para sobreviver a restart.
ENV DONS_STATE_PATH=/data/dons-state.json

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 \
  && mkdir -p /data && chown nextjs:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
