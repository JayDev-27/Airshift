FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/domain.mjs ./src/domain.mjs
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["npm", "start"]
