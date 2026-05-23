import {Kafka} from 'kafkajs';
import EVENTS from '../../../constant/event';

const kafka = new Kafka({ clientId: 'order-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();

let producerConnectPromise: Promise<void> | null = null;

async function ensureProducerConnected() {
  if (!producerConnectPromise) {
    producerConnectPromise = producer.connect();
  }
  await producerConnectPromise;
}


export async function emitOrderEvent(productId: number, quantity: number) {
  await ensureProducerConnected();
  await producer.send({
    topic: EVENTS.ORDER_PLACED,
    messages: [{ value: JSON.stringify({productId, quantity }) }],
  });
};