import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { CartServices } from '../application/commands'; // Your business logic
import { cartHandler } from './controllers';  
import { prisma } from '../db';


const PROTO_PATH = path.resolve(process.cwd(), './proto/cart.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const cartService = protoDescriptor.cart.CartService;


const cartLogic = new CartServices(prisma);

const server = new grpc.Server();

server.addService(cartService.service, cartHandler(cartLogic));

const PORT = '0.0.0.0:50054';
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Server running at ${PORT}`);
    server.start();
});