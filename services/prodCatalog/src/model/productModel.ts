import { InferSchemaType, Model, Schema, model, models } from "mongoose";
import mongoose from "mongoose";
import Category from "./categoryModel";
import { randomBytes } from "crypto";

function uuidv7(): string {
  const now = BigInt(Date.now());
  const tsHex = now.toString(16).padStart(12, "0");
  const rand = randomBytes(10).toString("hex");

  const p1 = tsHex.slice(0, 8);
  const p2 = tsHex.slice(8, 12);
  const p3 = `7${rand.slice(0, 3)}`;
  const variantNibble = (parseInt(rand.slice(3, 4), 16) & 0x3) | 0x8;
  const p4 = `${variantNibble.toString(16)}${rand.slice(4, 7)}`;
  const p5 = rand.slice(7, 19);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

const productSchema = new Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      immutable: true,
      default: uuidv7,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    collection: "products",
    timestamps: true,
    versionKey: false,
  }
);

export type ProductDocument = InferSchemaType<typeof productSchema>;

export const ProductModel: Model<ProductDocument> =
  models.Product || model<ProductDocument>("Product", productSchema);

export default ProductModel;
