import express,{ Request, Response } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser'
import path from 'path';
import { OAuth2Client, GoogleAuth } from "google-auth-library";

const {generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'change-this-secret',
  getSessionIdentifier: (req: Request) => req.ip || req.get('user-agent') || '',
  cookieName: 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});

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

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/auth/google/callback"
);


const router = express.Router();

router.use(cookieParser());
router.use(doubleCsrfProtection);

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

router.post('/forgot-password', (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    client.ForgotPassword({ email }, (err: any, response: any) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
});

router.post('/reset-password', (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({
            message: 'Token and new password are required'
        });
    }

    client.ResetPassword({ token, newPassword }, (err: any, response: any) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
});

router.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});

router.get('/auth/google', (req, res) => {
  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    state: 'random_string_or_session_id' 
  });
  res.redirect(authUrl);
});

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
