import { randomUUID } from "crypto";
import type { ProductDocument } from "../model/productModel";
import { kafkaClient } from "./client";
import {
    CatalogEventEnvelope,
    CatalogProductPayload,
} from "./events";
import EVENTS from "../../../constant/event";

const producer = kafkaClient.producer();
let producerConnectPromise: Promise<void> | null = null;

async function ensureProducerConnected() {
    if (!producerConnectPromise) {
        producerConnectPromise = producer.connect();
    }

    await producerConnectPromise;
}

function toProductPayload(product: ProductDocument): CatalogProductPayload {
    return {
        productId: product.productId,
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category?.toString(),
        description: product.description ?? "",
        isActive: product.isActive,
    };
}

function buildEnvelope<T>(
    type: CatalogEventEnvelope<T>["type"],
    payload: T
): CatalogEventEnvelope<T> {
    return {
        eventId: randomUUID(),
        type,
        occurredAt: new Date().toISOString(),
        source: "prodcatalog-service",
        payload,
    };
}

async function publishCatalogEvent(topic: string, envelope: CatalogEventEnvelope<CatalogProductPayload>) {
    await ensureProducerConnected();

    await producer.send({
        topic,
        messages: [
            {
                key: envelope.payload.productId,
                value: JSON.stringify(envelope),
            },
        ],
    });
}

export async function emitProductCreated(product: ProductDocument) {
    await publishCatalogEvent(
        EVENTS.PRODUCT_CREATED,
        buildEnvelope("created", toProductPayload(product))
    );
}

export async function emitProductUpdated(product: ProductDocument) {
    await publishCatalogEvent(
        EVENTS.PRODUCT_UPDATED,
        buildEnvelope("updated", toProductPayload(product))
    );
}

export async function emitProductArchived(product: ProductDocument) {
    await publishCatalogEvent(
        EVENTS.PRODUCT_ARCHIVED,
        buildEnvelope("archived", toProductPayload(product))
    );
}

export async function disconnectProducer() {
    if (!producerConnectPromise) {
        return;
    }

    await producer.disconnect();
    producerConnectPromise = null;
}

export async function publishCatalogEventSafely(
    action: () => Promise<void>,
    context: string
) {
    try {
        await action();
    } catch (error) {
        console.error(`Kafka publish failed (${context}):`, error);
    }
}
