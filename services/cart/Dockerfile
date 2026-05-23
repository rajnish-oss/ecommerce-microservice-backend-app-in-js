FROM node:20-alpine

WORKDIR /src

COPY package*.json ./
RUN npm install
COPY . .
COPY ./proto ./proto

# Regenerate Prisma client for Linux environment
RUN npx prisma generate --schema=services/cart/prisma/schema.prisma

EXPOSE 50054
CMD ["npx", "tsx", "services/cart/src/api/client.ts"]