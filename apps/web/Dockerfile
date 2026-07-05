FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN npm install --workspace=@estoque/web --workspace=@estoque/shared
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build -w @estoque/shared
RUN npm run build -w @estoque/web

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
