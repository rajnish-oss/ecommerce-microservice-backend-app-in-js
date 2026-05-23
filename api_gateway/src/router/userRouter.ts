import express,{ Request, Response } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import passport from 'passport';
import path from 'path';


// 1. Load the same proto file
const packageDefinition = protoLoader.loadSync(
    path.resolve(process.cwd(), '../proto/user.proto')
);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;

// 2. Access the Service Client constructor
const UserService = protoDescriptor.user.UserService;

// 3. Instantiate the client
const client = new UserService(
    'user-service:50051', 
    grpc.credentials.createInsecure()
);


const router = express.Router();

router.post('/login', async(req:Request, res:Response) => {
    const data = req.body;

    if(!data){
        return res.status(400).json({ message: 'Invalid request' });
    }

    await client.Login(data,(err: any, response: any)=>{
        if(err){
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
})

router.post('/register',async (req:Request, res:Response) => {
    const data = req.body;

    if(!data){
        return res.status(400).json({ message: 'Invalid request' });
    }

    await client.Register(data,(err: any, response: any)=>{
        if(err){
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
})

router.post('/google-auth',(req:Request,res:Response)=>{
    passport.authenticate("google", {
        scope: ["https://www.googleapis.com/auth/plus.login", "email"],
    })(req, res);
})

router.get('/google/callback',(req:Request,res:Response)=>{
    const data = req.query;

    if(!data){
        return res.status(400).json({ message: 'Invalid request' });
    }

    client.GoogleCallback(data,(err: any, response: any)=>{
        if(err){
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
})

export default router;