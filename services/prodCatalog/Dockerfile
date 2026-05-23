FROM node:20-alpine

WORKDIR /src

COPY package*.json ./
RUN npm install
COPY . .
COPY ./proto ./proto
EXPOSE 50056
CMD ["npm", "run", "dev"]