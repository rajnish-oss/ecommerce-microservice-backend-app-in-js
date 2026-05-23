FROM node:20-alpine

WORKDIR /src

COPY package*.json ./
RUN npm install
COPY . .
COPY ./proto ./proto

# Regenerate Prisma client for Linux environment
RUN npx prisma generate --schema=services/order/prisma/schema.prisma

EXPOSE 50058
CMD ["npx", "tsx", "services/order/src/api/client.ts"]