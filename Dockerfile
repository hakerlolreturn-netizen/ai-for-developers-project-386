FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 STATIC_DIR=/app/frontend/dist
COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --omit=dev -w backend && npm cache clean --force
COPY --from=build /app/api/dist/openapi.yaml api/dist/
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist frontend/dist
EXPOSE 3000
USER node
CMD ["node", "backend/dist/server.js"]
