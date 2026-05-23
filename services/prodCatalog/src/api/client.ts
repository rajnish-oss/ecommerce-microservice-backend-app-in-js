import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { adminCommands } from "../application/admin.commands";
import { miscelCommands } from '../application/miscel.commands';
import { publicCommands } from '../application/public.commands';
import { InventoryHandler } from './controller';
import { connectToDatabase } from '../db';



const PROTO_PATH = path.resolve(process.cwd(), './proto/productCat.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const ProductCatalogService = protoDescriptor.productcatalog.ProductCatalogService;

async function startServer() {
    await connectToDatabase();

    const adminCommand = new adminCommands();
    const miscelCommand = new miscelCommands();
    const publicCommand = new publicCommands();

    const server = new grpc.Server();
    server.addService(ProductCatalogService.service, InventoryHandler(adminCommand, miscelCommand, publicCommand));

    const PORT = '0.0.0.0:50056';
    server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`Server running at ${PORT}`);
        server.start();
    });
}

startServer().catch((error) => {
    console.error('Failed to start prodCatalog service:', error);
    process.exit(1);
});