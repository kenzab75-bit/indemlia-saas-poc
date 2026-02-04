import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// POST /dossiers/:dossierId/documents - Upload document
router.post('/:dossierId/documents', async (req: AuthRequest, res) => {
  try {
    const { dossierId } = req.params;
    const { fileName, fileType, fileSizeBytes, s3Url } = req.body;

    if (!fileName) {
      res.status(400).json({ error: 'fileName required' });
      return;
    }

    const dossier = await prisma.dossier.findUnique({
      where: { id: dossierId },
    });

    if (!dossier) {
      res.status(404).json({ error: 'Dossier not found' });
      return;
    }

    if (dossier.victimeId !== req.userId && req.userRole !== 'EXPERT') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const document = await prisma.document.create({
      data: {
        id: uuidv4(),
        dossierId,
        uploadedById: req.userId!,
        fileName,
        fileType,
        fileSizeBytes: fileSizeBytes ? BigInt(fileSizeBytes) : null,
        s3Key: `dossiers/${dossierId}/${fileName}`,
        s3Url,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        userId: req.userId,
        userRole: req.userRole,
        action: 'UPLOAD_DOCUMENT',
        resourceType: 'DOCUMENT',
        resourceId: document.id,
        details: { fileName, dossierId },
      },
    });

    // Notification
    if (dossier.expertId) {
      await prisma.notification.create({
        data: {
          id: uuidv4(),
          recipientId: dossier.expertId,
          type: 'DOCUMENT_UPLOADED',
          subject: 'Nouveau document uploadé',
          body: `Un nouveau document "${fileName}" a été ajouté au dossier "${dossier.titre}".`,
          relatedDossierId: dossierId,
        },
      });
    }

    res.status(201).json(document);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /dossiers/:dossierId/documents - List documents
router.get('/:dossierId/documents', async (req: AuthRequest, res) => {
  try {
    const { dossierId } = req.params;

    const dossier = await prisma.dossier.findUnique({
      where: { id: dossierId },
    });

    if (!dossier) {
      res.status(404).json({ error: 'Dossier not found' });
      return;
    }

    if (dossier.victimeId !== req.userId && dossier.expertId !== req.userId && req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const documents = await prisma.document.findMany({
      where: { dossierId },
    });

    res.json({ data: documents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /documents/:id - Delete document
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const dossier = await prisma.dossier.findUnique({
      where: { id: document.dossierId },
    });

    if (dossier?.victimeId !== req.userId && req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await prisma.document.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
