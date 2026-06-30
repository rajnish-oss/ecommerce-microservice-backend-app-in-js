import { Kafka, logLevel } from "kafkajs";

const kafkaBrokers = (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);

export const kafkaClient = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? "prodcatalog-service",
    brokers: kafkaBrokers,
    logLevel: logLevel.WARN,
});

export const kafkaGroupId = process.env.KAFKA_GROUP_ID ?? "prodcatalog-group";
