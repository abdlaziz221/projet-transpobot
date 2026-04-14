# ──────────────────────────────────────────────
# STAGE 1 : Dépendances
# ──────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Installer les outils natifs nécessaires à certains packages (ex: sharp, xlsx)
RUN apk add --no-cache libc6-compat

# Copier les manifestes de dépendances
COPY package.json package-lock.json ./

# npm ci = install strictement fidèle au lock file (reproductible)
RUN npm ci

# ──────────────────────────────────────────────
# STAGE 2 : Build
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Récupérer les node_modules déjà installés
COPY --from=deps /app/node_modules ./node_modules

# Copier tout le code source
COPY . .

# Variable d'environnement injectée au build (URL de l'API)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Désactiver la télémétrie Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Générer le build optimisé
RUN npm run build

# ──────────────────────────────────────────────
# STAGE 3 : Runner (image finale légère)
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier les fichiers statiques publics
COPY --from=builder /app/public ./public

# Copier le build Next.js avec les bonnes permissions
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copier la config Next.js
COPY --from=builder /app/next.config.ts ./

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
