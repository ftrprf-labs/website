# FTRLABS Invitation Manager (Testerbeheer) — managed-container deploy (Render).
# Long-lived Node process serving the admin SPA + JSON API from one origin.
FROM node:22-slim
WORKDIR /app

# Install production deps first (better layer caching). xlsx is the only dep.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App code.
COPY server ./server
COPY public ./public

# Render injects PORT; the app also reads HOST. Bind all interfaces so the
# platform can reach it, and run in production mode (enables fail-closed checks).
ENV PORT=8080
ENV HOST=0.0.0.0
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server/index.mjs"]
