import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// POST /dossiers/:id/status - Change status
router.post('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { nouveauStatut, raisonChangement } = req.body;

    if (!nouveauStatut) {
      res.status(400).json({ error: 'nouveauStatut required' });
      return;
    }

    const dossier = await prisma.dossier.findUnique({
      where: { id },
    });

    if (!dossier) {
      res.status(404).json({ error: 'Dossier not found' });
      return;
    }

    if (dossier.expertId !== req.userId && req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden - Only expert can change status' });
      return;
    }

    const ancienStatut = dossier.statut;

    const updated = await prisma.dossier.update({
      where: { id },
      data: { statut: nouveauStatut as any },
    });

    // Record history
    await prisma.dossierStatusHistory.create({
      data: {
        id: uuidv4(),
        dossierId: id,
        changedById: req.userId!,
        ancienStatut,
        nouveauStatut,
        raisonChangement,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        userId: req.userId,
        userRole: req.userRole,
        action: 'CHANGE_STATUS',
        resourceType: 'DOSSIER',
        resourceId: id,
        details: {
          ancienStatut,
          nouveauStatut,
          raisonChangement,
        },
      },
    });

    // Notification to victime
    await prisma.notification.create({
      data: {
        id: uuidv4(),
        recipientId: dossier.victimeId,
        type: 'STATUS_CHANGED',
        subject: 'Mise à jour de votre dossier',
        body: `Votre dossier "${dossier.titre}" est maintenant "${nouveauStatut}".`,
        relatedDossierId: id,
        sentAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /dossiers/:id/status-history - Get status history
router.get('/:id/status-history', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const dossier = await prisma.dossier.findUnique({
      where: { id },
    });

    if (!dossier) {
      res.status(404).json({ error: 'Dossier not found' });
      return;
    }

    if (dossier.victimeId !== req.userId && dossier.expertId !== req.userId && req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const history = await prisma.dossierStatusHistory.findMany({
      where: { dossierId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
