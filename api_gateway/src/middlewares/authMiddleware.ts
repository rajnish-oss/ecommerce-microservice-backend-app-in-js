import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

// Load the public key once (Sync is fine during startup/initialization)
// Note: Verification uses the PUBLIC key, not the private key.
const publicKey = fs.readFileSync(path.resolve(process.cwd(), '../secretKeys/public_key.pem'), 'utf-8');

export const authMiddleware = (req: any, res: any, next: any) => {
  console.log(req.headers);
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'No token provided or invalid format' });
  }

  const token = authHeader.split(' ')[1];

  // We pass the public key and specify the algorithm as RS256
  jwt.verify(token, publicKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      // Log err for debugging if needed: console.error(err);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  });
};