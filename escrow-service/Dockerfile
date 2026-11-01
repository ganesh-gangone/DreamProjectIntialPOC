FROM node:22.14.0-alpine3.21 AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM node:22.14.0-alpine3.21
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /app/proof_media && chown -R node:node /app/proof_media
COPY --from=builder /app/node_modules ./node_modules
COPY server.js ./
USER node
EXPOSE 4003
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4003/health || exit 1
CMD ["node", "server.js"]
