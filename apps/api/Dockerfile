FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm install --workspace=@estoque/api --workspace=@estoque/shared
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build -w @estoque/shared
RUN cd apps/api && npx prisma generate
RUN npm run build -w @estoque/api

FROM node:20-alpine
RUN apk add --no-cache postgresql-client wget
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api ./apps/api
RUN mkdir -p uploads backups
EXPOSE 3001
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/server.js"]
