import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma';
import { AppError } from '../../lib/utils';

const execAsync = promisify(exec);
const backupDir = process.env.BACKUP_DIR || './backups';

if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

function parseDatabaseUrl() {
  const url = process.env.DATABASE_URL || '';
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!match) throw new AppError(500, 'DATABASE_URL inválida');
  return { user: match[1], password: match[2], host: match[3], port: match[4], database: match[5] };
}

export async function createBackup() {
  const start = Date.now();
  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
  const filepath = path.join(backupDir, filename);

  const log = await prisma.backupLog.create({
    data: { filename, status: 'PENDING' },
  });

  try {
    const db = parseDatabaseUrl();
    const env = { ...process.env, PGPASSWORD: db.password };
    const cmd = `pg_dump -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} -f "${filepath}"`;
    await execAsync(cmd, { env });

    const stats = fs.statSync(filepath);
    await prisma.backupLog.update({
      where: { id: log.id },
      data: {
        status: 'SUCCESS',
        size: BigInt(stats.size),
        duration: Date.now() - start,
      },
    });

    return { id: log.id, filename, size: stats.size };
  } catch (error) {
    await prisma.backupLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        duration: Date.now() - start,
      },
    });
    throw new AppError(500, 'Falha ao criar backup');
  }
}

export async function listBackups() {
  const backups = await prisma.backupLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  return backups.map((b) => ({ ...b, size: Number(b.size) }));
}

export async function restoreBackup(id: string) {
  const backup = await prisma.backupLog.findUnique({ where: { id } });
  if (!backup || backup.status !== 'SUCCESS') {
    throw new AppError(404, 'Backup não encontrado ou inválido');
  }

  const filepath = path.join(backupDir, backup.filename);
  if (!fs.existsSync(filepath)) throw new AppError(404, 'Arquivo de backup não encontrado');

  const db = parseDatabaseUrl();
  const env = { ...process.env, PGPASSWORD: db.password };
  const cmd = `psql -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} -f "${filepath}"`;
  await execAsync(cmd, { env });

  return { message: 'Backup restaurado com sucesso' };
}

export function scheduleBackup() {
  const cron = require('node-cron');
  cron.schedule('0 2 * * *', async () => {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'backup_auto_enabled' },
      });
      if (setting?.value === 'true') {
        await createBackup();
        console.log('Backup automático concluído');
      }
    } catch (err) {
      console.error('Erro no backup automático:', err);
    }
  });
}
