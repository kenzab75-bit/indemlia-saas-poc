import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.substring(7);
  const secret = process.env.JWT_SECRET || 'dev_secret';

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.userId = decoded.userId as string;
    req.userRole = decoded.role as string;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
