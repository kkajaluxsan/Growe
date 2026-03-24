FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN node -e "require('fs').mkdirSync('migrations', { recursive: true })" 2>/dev/null || true

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server.js"]
