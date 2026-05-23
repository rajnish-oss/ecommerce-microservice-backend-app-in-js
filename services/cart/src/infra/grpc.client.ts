import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

// Load the same proto file your server uses
const packageDefinition = protoLoader.loadSync(
    path.resolve(process.cwd(), './proto/productCat.proto')
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;

// Use the exact package.service name from proto (productcatalog package, ProductCatalogService)
const ProductCatalogServiceClient = protoDescriptor.productcatalog.ProductCatalogService;

// Create the client instance (use service DNS hostname for Docker network)
export const inventoryClient = new ProductCatalogServiceClient(
    'prodcatalog_service:50056', // Docker service DNS hostname
    grpc.credentials.createInsecure()
);