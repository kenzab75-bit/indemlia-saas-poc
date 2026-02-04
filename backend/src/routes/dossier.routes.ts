import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// POST /dossiers - Create dossier
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { titre, dateAccident, lieuAccident, descriptionAccident } = req.body;

    if (!titre || !dateAccident) {
      res.status(400).json({ error: 'Titre and dateAccident required' });
      return;
    }

    const dossier = await prisma.dossier.create({
      data: {
        id: uuidv4(),
        titre,
        dateAccident: new Date(dateAccident),
        lieuAccident,
        descriptionAccident,
        victimeId: req.userId!,
        statut: 'CRÉÉ',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        userId: req.userId,
        userRole: req.userRole,
        action: 'CREATE_DOSSIER',
        resourceType: 'DOSSIER',
        resourceId: dossier.id,
        details: { titre },
      },
    });

    res.status(201).json(dossier);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /dossiers - List dossiers
router.get('/', async (req: AuthRequest, res) => {
  try {
    const dossiers = await prisma.dossier.findMany({
      where: { victimeId: req.userId },
    });

    res.json({ data: dossiers, total: dossiers.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /dossiers/:id - Get dossier
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const dossier = await prisma.dossier.findUnique({
      where: { id: req.params.id },
      include: { documents: true, statusHistory: true },
    });

    if (!dossier) {
      res.status(404).json({ error: 'Dossier not found' });
      return;
    }

    if (dossier.victimeId !== req.userId && req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json(dossier);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /dossiers/:id - Update dossier
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const { titre, descriptionAccident } = req.body;

    const dossier = await prisma.dossier.findUnique({
      where: { id: req.params.id },
    });

    if (!dossier) {
      res.status(404).json({ error: 'Dossier not found' });
      return;
    }

    if (dossier.victimeId !== req.userId && req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updated = await prisma.dossier.update({
      where: { id: req.params.id },
      data: {
        ...(titre && { titre }),
        ...(descriptionAccident && { descriptionAccident }),
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
