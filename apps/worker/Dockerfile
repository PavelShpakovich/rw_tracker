FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@10.33.2

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --filter @rw/worker...

COPY . .

CMD ["pnpm", "--filter", "@rw/worker", "start"]
