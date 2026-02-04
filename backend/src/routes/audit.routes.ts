import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /logs - Get audit logs (admin only)
router.get('/', async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden - Admin only' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const total = await prisma.auditLog.count();

    res.json({ data: logs, total, limit, offset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
