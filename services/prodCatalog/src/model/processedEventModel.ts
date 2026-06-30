import { InferSchemaType, Model, Schema, model, models } from "mongoose";

const processedEventSchema = new Schema(
    {
        eventId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        topic: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        collection: "processed_events",
        timestamps: true,
        versionKey: false,
    }
);

export type ProcessedEventDocument = InferSchemaType<typeof processedEventSchema>;

export const ProcessedEventModel: Model<ProcessedEventDocument> =
    models.ProcessedEvent ||
    model<ProcessedEventDocument>("ProcessedEvent", processedEventSchema);

export default ProcessedEventModel;
