import { Response } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import prisma from '../../lib/prisma';
import { listStock } from '../stock/stock.service';

type ReportType =
  | 'out-of-stock'
  | 'below-minimum'
  | 'stale'
  | 'top-sold'
  | 'top-moved'
  | 'entries'
  | 'exits'
  | 'inventory'
  | 'history';

async function getReportData(type: ReportType, filters?: { startDate?: string; endDate?: string }) {
  switch (type) {
    case 'out-of-stock': {
      const data = await listStock({ outOfStock: true, limit: 1000 });
      return data.items;
    }
    case 'below-minimum': {
      const data = await listStock({ lowStock: true, limit: 1000 });
      return data.items;
    }
    case 'stale': {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const products = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          OR: [{ lastMovementAt: { lt: cutoff } }, { lastMovementAt: null }],
        },
        include: { category: true, stockBalances: true },
      });
      return products.map((p) => ({
        name: p.name,
        internalCode: p.internalCode,
        category: p.category?.name ?? null,
        lastMovement: p.lastMovementAt,
        quantity: p.stockBalances.reduce((s, b) => s + Number(b.quantity), 0),
      }));
    }
    case 'top-moved': {
      const start = filters?.startDate
        ? new Date(filters.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const grouped = await prisma.stockMovement.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        _count: true,
        where: { createdAt: { gte: start } },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 20,
      });
      return Promise.all(
        grouped.map(async (g) => {
          const p = await prisma.product.findUnique({
            where: { id: g.productId },
            select: { name: true, internalCode: true },
          });
          return { ...p, totalMoved: Number(g._sum.quantity), count: g._count };
        })
      );
    }
    case 'top-sold': {
      const start = filters?.startDate
        ? new Date(filters.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const grouped = await prisma.stockMovement.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        where: { type: 'EXIT', createdAt: { gte: start } },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 20,
      });
      return Promise.all(
        grouped.map(async (g) => {
          const p = await prisma.product.findUnique({
            where: { id: g.productId },
            select: { name: true, internalCode: true, salePrice: true },
          });
          return {
            ...p,
            quantity: Number(g._sum.quantity),
            revenue: Number(g._sum.quantity) * Number(p?.salePrice || 0),
          };
        })
      );
    }
    case 'entries':
    case 'exits': {
      const start = filters?.startDate ? new Date(filters.startDate) : undefined;
      const end = filters?.endDate ? new Date(filters.endDate) : undefined;
      const types =
        type === 'entries'
          ? ['ENTRY', 'RETURN']
          : ['EXIT', 'LOSS', 'BREAKAGE', 'INTERNAL_CONSUMPTION', 'EXCHANGE'];
      return prisma.stockMovement.findMany({
        where: {
          type: { in: types as ('ENTRY' | 'RETURN' | 'EXIT' | 'LOSS' | 'BREAKAGE' | 'INTERNAL_CONSUMPTION' | 'EXCHANGE')[] },
          ...(start || end
            ? { createdAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } }
            : {}),
        },
        include: {
          product: { select: { name: true, internalCode: true } },
          user: { select: { name: true } },
          location: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
    }
    case 'inventory': {
      const data = await listStock({ limit: 1000 });
      return data.items;
    }
    case 'history': {
      return prisma.auditLog.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
    }
    default:
      return [];
  }
}

function flattenForExport(data: unknown[]): Record<string, unknown>[] {
  return data.map((item) => {
    const flat: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item as object)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        for (const [k, v] of Object.entries(value as object)) {
          flat[`${key}_${k}`] = v;
        }
      } else {
        flat[key] = value instanceof Date ? value.toISOString() : value;
      }
    }
    return flat;
  });
}

export async function generateReport(
  type: ReportType,
  format: 'json' | 'csv' | 'xlsx' | 'pdf',
  filters?: { startDate?: string; endDate?: string },
  res?: Response
) {
  const data = await getReportData(type, filters);

  if (format === 'json') return data;

  const flat = flattenForExport(data);
  if (flat.length === 0) {
    if (res) {
      res.setHeader('Content-Type', 'text/plain');
      return res.send('Nenhum dado encontrado');
    }
    return [];
  }

  const headers = Object.keys(flat[0]);

  if (format === 'csv') {
    const csv = [headers.join(','), ...flat.map((r) => headers.map((h) => `"${r[h] ?? ''}"`).join(','))].join('\n');
    if (res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio-${type}.csv`);
      return res.send(csv);
    }
    return csv;
  }

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Relatório');
    sheet.addRow(headers);
    flat.forEach((row) => sheet.addRow(headers.map((h) => row[h])));
    if (res) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio-${type}.xlsx`);
      await workbook.xlsx.write(res);
      return;
    }
    return workbook;
  }

  if (format === 'pdf' && res) {
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio-${type}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).text(`Relatório: ${type}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    flat.slice(0, 50).forEach((row, i) => {
      doc.text(`${i + 1}. ${JSON.stringify(row)}`);
      doc.moveDown(0.5);
    });
    doc.end();
    return;
  }

  return data;
}

export const REPORT_TYPES: { id: ReportType; label: string }[] = [
  { id: 'out-of-stock', label: 'Produtos em falta' },
  { id: 'below-minimum', label: 'Abaixo do mínimo' },
  { id: 'stale', label: 'Produtos parados' },
  { id: 'top-sold', label: 'Mais vendidos' },
  { id: 'top-moved', label: 'Mais movimentados' },
  { id: 'entries', label: 'Entradas' },
  { id: 'exits', label: 'Saídas' },
  { id: 'inventory', label: 'Inventário' },
  { id: 'history', label: 'Histórico completo' },
];
