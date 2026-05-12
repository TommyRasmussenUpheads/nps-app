FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN mkdir -p /data && ls -la /app/frontend/dist

EXPOSE 3003

ENV NODE_ENV=production
ENV DB_PATH=/data/nps.db

CMD ["node", "server.js"]
