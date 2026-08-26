import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtUserPayload {
  id: number;
  email: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export const JWT_SECRET = process.env.JWT_SECRET || 'gerador_certificado_super_secret_jwt_key_2026';

/**
 * Middleware that validates the Bearer JWT token from Authorization header.
 * Attaches decoded user payload to req.user.
 * Returns HTTP 401 Unauthorized if token is missing or invalid.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token não fornecido ou inválido'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token não fornecido ou inválido'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token inválido ou expirado'
    });
    return;
  }
};
