export type CatalogEventType = "created" | "updated" | "archived" | "stock-sync";

export interface CatalogEventEnvelope<T> {
    eventId: string;
    type: CatalogEventType;
    occurredAt: string;
    source: "prodcatalog-service" | "inventory-service";
    payload: T;
}

export interface CatalogProductPayload {
    productId: string;
    name: string;
    price: number;
    stock: number;
    category?: string;
    description?: string;
    isActive: boolean;
}

export interface InventoryStockUpdatePayload {
    productId: string;
    stock: number;
    name?: string;
    price?: number;
}

export function parseEventPayload<T>(raw: unknown): T {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid event payload");
    }

    const record = raw as Record<string, unknown>;
    if ("payload" in record && record.payload && typeof record.payload === "object") {
        return record.payload as T;
    }

    return raw as T;
}

export function getEventId(raw: unknown, fallback: string): string {
    if (raw && typeof raw === "object" && "eventId" in raw) {
        const eventId = (raw as { eventId?: unknown }).eventId;
        if (typeof eventId === "string" && eventId.trim()) {
            return eventId.trim();
        }
    }

    return fallback;
}
