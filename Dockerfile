FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY public/ ./public/
COPY src/ ./src/

RUN cp node_modules/oidc-client-ts/dist/browser/oidc-client-ts.min.js public/oidc-client-ts.js \
  && npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
