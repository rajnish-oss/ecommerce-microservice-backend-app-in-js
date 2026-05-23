import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { PaymentService } from '../application/commands';
import { paymentHandler } from './controller';
import { prisma } from '../db';


const PROTO_PATH = path.resolve(process.cwd(), './proto/payment.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
// If a dedicated payment proto is added in future, switch to protoDescriptor.payment.PaymentService
const paymentService = protoDescriptor.order?.OrderService || protoDescriptor.payment?.PaymentService;
const paymentLogic = new PaymentService(prisma);

const server = new grpc.Server();

server.addService(paymentService.service, paymentHandler(paymentLogic));

const PORT = '0.0.0.0:50052';
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
	if (err) {
		console.error(err);
		return;
	}
	console.log(`Payment service running at ${PORT}`);
	server.start();
});
