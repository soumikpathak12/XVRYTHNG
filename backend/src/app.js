/**
 * Express app: CORS, JSON body, auth routes.
 * No auth middleware on login; protected routes will use JWT middleware later.
 */
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));
app.use(express.json({ limit: '256kb' }));

app.use('/uploads', express.static(uploadsDir));

app.get('/health', (_, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);


// 404
app.use((_, res) => res.status(404).json({ success: false, message: 'Not found' }));

// Error handler
app.use((err, _, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;
