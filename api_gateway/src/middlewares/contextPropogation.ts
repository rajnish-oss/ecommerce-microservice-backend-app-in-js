import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';


const asyncLocalStorage = new AsyncLocalStorage();

export const gatewayMiddleware = (req, res, next) => {
    // 1. Generate or extract the ID
    const requestID = req.headers['x-request-id'] || uuidv4();
    
    // 2. Prepare the store
    const store = { requestID };
    
    // 3. Start the context and continue
    asyncLocalStorage.run(store, () => {
        // Add to header so downstream services see it
        res.setHeader('x-request-id', requestID);
        next();
    });
};

// Helper function to get context anywhere in your code
export const getRequestID = () => asyncLocalStorage.getStore()?.requestID;