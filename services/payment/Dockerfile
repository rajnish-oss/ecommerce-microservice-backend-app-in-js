FROM node:20-alpine

WORKDIR /src

COPY package*.json ./
RUN npm install
COPY . .
COPY ./proto ./proto

# Regenerate Prisma client for Linux environment
RUN npx prisma generate --schema=services/payment/prisma/schema.prisma

EXPOSE 50052
CMD ["npx", "tsx", "services/payment/src/api/client.ts"]