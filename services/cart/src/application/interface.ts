import { cartSchema, CartItem } from "./commands";

export interface ICartRepository {
  addItem(cart: cartSchema): Promise<void>;
  removeItem(cart: cartSchema): Promise<void>;
  totalAmount(cart: cartSchema): Promise<number>;
  getItems(cart: cartSchema): Promise<CartItem[]>;
}