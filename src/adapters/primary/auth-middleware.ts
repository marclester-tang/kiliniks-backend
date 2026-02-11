
import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from "aws-jwt-verify";

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

// Initialize verifier
let verifier: any;

const getVerifier = () => {
    if (!verifier) {
        if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
            console.warn('Cognito environment variables not set. Auth middleware will fail if called.');
            return null;
        }

        verifier = CognitoJwtVerifier.create({
            userPoolId: process.env.COGNITO_USER_POOL_ID,
            tokenUse: "id", // or "access"
            clientId: process.env.COGNITO_CLIENT_ID,
        });
    }
    return verifier;
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Skip auth for Swagger UI and API Docs
    if (req.path.startsWith('/api-docs')) {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        // If no header, we can either block or allow as guest (for now block to match AWS)
        return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Invalid Authorization header format' });
    }

    try {
        const v = getVerifier();
        if (!v) {
            return res.status(500).json({ error: 'Authentication configuration missing on server' });
        }

        const payload = await v.verify(token);
        req.user = payload;
        
        // Log the user for debugging
        // console.log('User authenticated:', payload.sub);
        
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        return res.status(401).json({ error: 'Unauthorized', details: (err as any).message });
    }
};
