# STAGE 1 : Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# On génère le build optimisé
RUN npm run build

# STAGE 2 : Runner (Image finale légère)
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# On ne copie que ce qui est nécessaire pour l'exécution
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Next.js telemetry disable (performance)
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "start"]
