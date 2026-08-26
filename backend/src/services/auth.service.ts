import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma';
import { Role } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  dojoId: string;
  role: Role;
}

export class AuthService {
  async login(email: string, passwordPlain: string): Promise<{ token: string; user: { id: string; name: string; role: Role; dojoId: string } }> {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    const isValid = await bcrypt.compare(passwordPlain, user.password);
    if (!isValid) {
      throw new Error('Credenciais inválidas');
    }

    const payload: AuthPayload = {
      userId: user.id,
      dojoId: user.dojoId,
      role: user.role,
    };

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(payload, secret, { expiresIn: '12h' });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        dojoId: user.dojoId,
      },
    };
  }
}
