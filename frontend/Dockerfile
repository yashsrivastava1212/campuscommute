# CampusCommute frontend — monorepo image for Railway.
# Service settings: Root Directory = blank, Config File = frontend/railway.toml

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN npm ci --include=dev

COPY . .

RUN npm run build -w frontend
RUN test -f frontend/.next/BUILD_ID

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/frontend ./frontend

WORKDIR /app/frontend

EXPOSE 3000

CMD ["npm", "run", "start"]
