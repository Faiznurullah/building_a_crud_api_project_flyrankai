FROM node:22-bookworm-slim

WORKDIR /app

# Install production dependencies first to cache this layer.
# --omit=optional skips better-sqlite3 (a native module); the container uses Postgres.
COPY package*.json ./
RUN npm ci --omit=dev --omit=optional

# App source.
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
