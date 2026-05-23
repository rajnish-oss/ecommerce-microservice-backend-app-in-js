import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { InventoryService } from '../application/commands';
import { InventoryController } from './controllers';
import {prisma} from '../db';



const PROTO_PATH = path.resolve(process.cwd(), './proto/inventory.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const inventoryService = protoDescriptor.inventory.InventoryService;

const inventoryLogic = new InventoryService(prisma);

const server = new grpc.Server();

server.addService(inventoryService.service, InventoryController(inventoryLogic));
const PORT = '0.0.0.0:50059';
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Server running at ${PORT}`);
    server.start();
});