import ProductModel from "../model/productModel";
import ProcessedEventModel from "../model/processedEventModel";
import { kafkaClient, kafkaGroupId } from "./client";
import {
    getEventId,
    InventoryStockUpdatePayload,
    parseEventPayload,
} from "./events";
import EVENTS from "../../../constant/event";

const consumer = kafkaClient.consumer({ groupId: kafkaGroupId });
let consumerStarted = false;

async function isAlreadyProcessed(eventId: string) {
    const existing = await ProcessedEventModel.findOne({ eventId }).lean();
    return Boolean(existing);
}

async function markAsProcessed(eventId: string, topic: string) {
    await ProcessedEventModel.create({ eventId, topic });
}

async function syncInventoryStock(payload: InventoryStockUpdatePayload) {
    const productId = String(payload.productId ?? "").trim();
    const stock = Number(payload.stock);

    if (!productId || !Number.isFinite(stock) || stock < 0) {
        throw new Error("Invalid inventory stock update payload");
    }

    const product = await ProductModel.findOneAndUpdate(
        { productId },
        { $set: { stock } },
        { new: true }
    );

    if (!product) {
        console.warn(`Inventory stock update ignored: product ${productId} not found in catalog`);
        return;
    }

    console.log(`Catalog stock synced for product ${productId}: ${stock}`);
}

export async function startCatalogConsumer() {
    if (consumerStarted) {
        return;
    }

    await consumer.connect();
    await consumer.subscribe({ topic: EVENTS.PRODUCT_UPDATED, fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) {
                console.error("Received empty Kafka message on", topic);
                return;
            }

            const fallbackEventId = `${topic}-${partition}-${message.offset}`;
            let eventId = fallbackEventId;

            try {
                const raw = JSON.parse(message.value.toString());
                eventId = getEventId(raw, fallbackEventId);

                if (await isAlreadyProcessed(eventId)) {
                    return;
                }

                const payload = parseEventPayload<InventoryStockUpdatePayload>(raw);

                if (raw?.source === "prodcatalog-service") {
                    await markAsProcessed(eventId, topic);
                    return;
                }

                await syncInventoryStock(payload);
                await markAsProcessed(eventId, topic);
            } catch (error) {
                console.error("Error processing catalog Kafka message:", error);
            }
        },
    });

    consumerStarted = true;
    console.log(`Kafka consumer subscribed to ${EVENTS.PRODUCT_UPDATED}`);
}

export async function stopCatalogConsumer() {
    if (!consumerStarted) {
        return;
    }

    await consumer.disconnect();
    consumerStarted = false;
}
