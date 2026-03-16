FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev --omit=optional && npm cache clean --force

COPY . .

EXPOSE 8080
USER node

CMD ["npm", "run", "start"]
