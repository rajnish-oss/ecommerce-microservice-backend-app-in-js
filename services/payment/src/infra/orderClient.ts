import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const packageDefinition = protoLoader.loadSync(
    path.resolve(process.cwd(), './proto/order.proto')
);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;

// Create the client pointing to your Order Service PORT
export const orderClient = new protoDescriptor.order.OrderService(
    'order_service:50058', // Docker service DNS hostname
    grpc.credentials.createInsecure()
);