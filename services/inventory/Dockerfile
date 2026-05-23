FROM node:20-alpine

WORKDIR /src

COPY package*.json ./
RUN npm install
COPY . .
COPY ./proto ./proto

# Regenerate Prisma client for Linux environment
RUN npx prisma generate --schema=services/inventory/prisma/schema.prisma

EXPOSE 50059
CMD ["npx", "tsx", "services/inventory/src/api/client.ts"]