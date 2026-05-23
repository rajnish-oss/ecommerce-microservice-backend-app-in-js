import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { UserService } from '../application/commands';
import  userHandler  from './controller';
import { prisma } from '../db';

const PROTO_PATH = path.resolve(process.cwd(), './proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const userService = protoDescriptor.user.UserService;

const userLogic = new UserService(prisma);

const server = new grpc.Server();

server.addService(userService.service, userHandler(userLogic));

const PORT = '0.0.0.0:50051';
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Server running at ${PORT}`);
    server.start();
});