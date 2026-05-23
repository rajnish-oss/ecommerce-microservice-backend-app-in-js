import {Kafka} from 'kafkajs';
import EVENTS from '../../../constant/event';
import type { Product } from '../application/commands';

const kafka = new Kafka({ clientId: 'inventory-service', brokers: ['localhost:9091'] });
const producer = kafka.producer();

await producer.connect();


export async function emitInventoryEvent(product: Product){
  await producer.send({
    topic: EVENTS.PRODUCT_UPDATED,
    messages: [{ value: JSON.stringify(product) }],
  });
};