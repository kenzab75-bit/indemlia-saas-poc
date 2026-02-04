import { Router, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Simple password hash (for POC only - use bcrypt in production)
    const passwordHash = Buffer.from(password).toString('base64');

    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role: 'VICTIME',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        userRole: 'VICTIME',
        action: 'REGISTER',
        resourceType: 'USER',
        resourceId: user.id,
        details: { email },
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Simple password check (for POC only - use bcrypt in production)
    const passwordHash = Buffer.from(password).toString('base64');
    if (passwordHash !== user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'dev_secret';
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      secret,
      { expiresIn: '7d' }
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        userRole: user.role,
        action: 'LOGIN',
        resourceType: 'USER',
        resourceId: user.id,
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'dev_secret';
    const decoded = jwt.verify(refreshToken, secret) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId as string } });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      { expiresIn: '15m' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;
