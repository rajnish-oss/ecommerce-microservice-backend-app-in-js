import {Kafka} from 'kafkajs';
import EVENTS from '../../../constant/event';

const kafkaBrokers = (process.env.KAFKA_BROKERS ?? 'kafka:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? 'order-service',
  brokers: kafkaBrokers
});
const producer = kafka.producer();

let producerConnectPromise: Promise<void> | null = null;

async function ensureProducerConnected() {
  if (!producerConnectPromise) {
    producerConnectPromise = producer.connect();
  }
  await producerConnectPromise;
}


export async function emitOrderEvent(productId: string, quantity: number) {
  await ensureProducerConnected();
  await producer.send({
    topic: EVENTS.ORDER_PLACED,
    messages: [{ value: JSON.stringify({productId, quantity }) }],
  });
};
