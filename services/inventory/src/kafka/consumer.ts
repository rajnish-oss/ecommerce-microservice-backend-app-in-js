import { Kafka } from "kafkajs";
import EVENTS from "../../../constant/event";
import { prisma } from "../db";
import { emitInventoryEvent } from "./producer";
import { InventoryService } from "../application/commands";
import { isAlreadyProcessed, markAsProcessed } from "../application/idempotency.commands";


const kafkaBrokers = (process.env.KAFKA_BROKERS ?? "localhost:9091")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

const kafka = new Kafka({ 
  clientId: process.env.KAFKA_CLIENT_ID ?? "inventory-service",
  brokers: kafkaBrokers,
});

const inventoryService = new InventoryService(prisma);


const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID ?? "inventory-group" });

export const getOrderEvent = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: EVENTS.ORDER_PLACED });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        if (!message.value) {
          throw new Error("Received empty Kafka message");
        }

        const event = JSON.parse(message.value.toString());

        // ✅ Validation
        if (!event.eventId || !event.productId || !event.quantity) {
          throw new Error("Invalid event payload");
        }

        // ✅ Idempotency check
        if (await isAlreadyProcessed(event.eventId)) return;

        // ✅ Core business logic
        const updatedProduct = await inventoryService.deacreaseStock(
          event.productId,
          event.quantity
        );

        // ✅ Emit next event
        await emitInventoryEvent(updatedProduct);

        await markAsProcessed(event.eventId);

      } catch (error) {
        console.error("❌ Error processing Kafka message:", error);

        // TODO: push to DLQ
      }
    },
  });
};