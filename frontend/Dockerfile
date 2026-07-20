# syntax=docker/dockerfile:1
FROM node:22.16.0-bookworm-slim
WORKDIR /app

ENV npm_config_registry=https://registry.npmjs.org/ \
    npm_config_audit=false \
    npm_config_fund=false \
    npm_config_update_notifier=false \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=10000 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_fetch_timeout=300000 \
    npm_config_loglevel=info

COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --prefer-online --loglevel=info

COPY . .
RUN npm run build

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
