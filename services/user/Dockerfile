FROM node:20-alpine

WORKDIR /src

COPY package*.json ./
RUN npm install
COPY . .
COPY ./proto ./proto

# Regenerate Prisma client for Linux environment
RUN npx prisma generate --schema=services/user/prisma/schema.prisma

EXPOSE 50051
CMD ["npx", "tsx", "services/user/src/api/client.ts"]