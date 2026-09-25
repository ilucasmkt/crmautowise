FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --from=build /app/dist ./dist
COPY server ./server
COPY api/_shared ./api/_shared
COPY tsconfig.json ./
EXPOSE 3000
CMD ["npx", "tsx", "server/index.ts"]
