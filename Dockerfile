# --- build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install all deps (including devDependencies — tsc/vite live there)
COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN npm run build

# --- runtime stage ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Only production deps + tsx for running server.ts directly
COPY package*.json ./
RUN npm install --omit=dev

# Bring built frontend and the server entry
COPY --from=builder /app/dist ./dist
COPY server.ts ./server.ts
COPY server ./server

# Zeabur/Vercel inject PORT; default to 3000 locally
EXPOSE 3000
CMD ["npm", "run", "start"]
