FROM node:24-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -qq && apt-get install -y -qq ffmpeg && \
    rm -rf /var/lib/apt/lists/* && \
    addgroup --system --gid 1001 aivideo && adduser --system --uid 1001 aivideo
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
RUN mkdir -p /data && chown aivideo:aivideo /data
USER aivideo
EXPOSE 7456
ENV NODE_ENV=production DATA_DIR=/data BIND_HOST=0.0.0.0
CMD ["node", "dist/index.js"]
