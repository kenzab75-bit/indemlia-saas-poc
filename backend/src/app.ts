import express, { Express } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import dossierRoutes from './routes/dossier.routes.js';
import documentRoutes from './routes/document.routes.js';
import statusRoutes from './routes/status.routes.js';
import auditRoutes from './routes/audit.routes.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/dossiers', authMiddleware, dossierRoutes);
app.use('/documents', authMiddleware, documentRoutes);
app.use('/dossiers', authMiddleware, statusRoutes);
app.use('/logs', authMiddleware, auditRoutes);

// Error handler
app.use(errorHandler);

export default app;
