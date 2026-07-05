import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { errorHandler } from './lib/utils';
import { initSocket } from './lib/socket';
import { scheduleBackup } from './modules/backup/backup.service';

import authRoutes from './modules/auth/auth.routes';
import categoryRoutes from './modules/categories/category.routes';
import supplierRoutes from './modules/suppliers/supplier.routes';
import userRoutes from './modules/users/user.routes';
import productRoutes from './modules/products/product.routes';
import stockRoutes from './modules/stock/stock.routes';
import movementRoutes from './modules/movements/movement.routes';
import purchaseRoutes from './modules/purchases/purchase.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportRoutes from './modules/reports/report.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import backupRoutes from './modules/backup/backup.routes';
import settingsRoutes from './modules/settings/settings.routes';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.API_PORT || 3001;

initSocket(httpServer);

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/settings', settingsRoutes);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  scheduleBackup();
}

httpServer.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});

export default app;
