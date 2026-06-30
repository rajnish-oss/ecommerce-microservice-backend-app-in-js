import * as grpc from "@grpc/grpc-js";

export class ServiceError extends Error {
    readonly code: grpc.status;

    constructor(message: string, code: grpc.status) {
        super(message);
        this.name = "ServiceError";
        this.code = code;
    }

    static invalidArgument(message: string) {
        return new ServiceError(message, grpc.status.INVALID_ARGUMENT);
    }

    static notFound(message: string) {
        return new ServiceError(message, grpc.status.NOT_FOUND);
    }

    static alreadyExists(message: string) {
        return new ServiceError(message, grpc.status.ALREADY_EXISTS);
    }

    static internal(message: string) {
        return new ServiceError(message, grpc.status.INTERNAL);
    }
}

export function requireNonEmptyString(value: unknown, fieldName: string): string {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
        throw ServiceError.invalidArgument(`${fieldName} is required`);
    }
    return normalized;
}

export function requirePositiveNumber(value: unknown, fieldName: string): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
        throw ServiceError.invalidArgument(`${fieldName} must be a non-negative number`);
    }
    return numericValue;
}

export function toGrpcCallbackError(error: unknown): { code: grpc.status; details: string } {
    if (error instanceof ServiceError) {
        return { code: error.code, details: error.message };
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("not found")) {
        return { code: grpc.status.NOT_FOUND, details: message };
    }

    if (
        normalizedMessage.includes("required") ||
        normalizedMessage.includes("cannot be empty") ||
        normalizedMessage.includes("invalid") ||
        normalizedMessage.includes("cannot be its own parent")
    ) {
        return { code: grpc.status.INVALID_ARGUMENT, details: message };
    }

    if (normalizedMessage.includes("already exist")) {
        return { code: grpc.status.ALREADY_EXISTS, details: message };
    }

    return { code: grpc.status.INTERNAL, details: message };
}
