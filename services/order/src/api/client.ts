import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { OrderServices } from '../application/commands';
import { orderHandler } from './controller';
import { prisma } from '../../db';



const PROTO_PATH = path.resolve(process.cwd(), './proto/order.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const orderService = protoDescriptor.order.OrderService;

const orderLogic = new OrderServices(prisma);

const server = new grpc.Server();

server.addService(orderService.service, orderHandler(orderLogic));

const PORT = '0.0.0.0:50058';
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Server running at ${PORT}`);
    server.start();
});