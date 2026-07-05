import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardTitle, CardValue } from '@/components/ui/card';
import { LoadingSpinner, Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { MOVEMENT_TYPE_LABELS } from '@estoque/shared';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Package, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';

export function DashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
    staleTime: 30000,
  });

  const { data: monthly } = useQuery({
    queryKey: ['dashboard-monthly'],
    queryFn: () => api.get('/dashboard/charts/monthly').then((r) => r.data),
  });

  const { data: entries } = useQuery({
    queryKey: ['dashboard-entries'],
    queryFn: () => api.get('/dashboard/charts/entries').then((r) => r.data),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Início</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-sm text-slate-500">Valor do estoque</CardTitle>
              <CardValue>{formatCurrency(summary?.totalValue || 0)}</CardValue>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-sm text-slate-500">Itens em estoque</CardTitle>
              <CardValue>{summary?.totalItems?.toFixed(0) || 0}</CardValue>
            </div>
          </div>
        </Card>
        <Card variant="danger">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <CardTitle className="text-sm">Em falta</CardTitle>
              <CardValue className="text-red-600">{summary?.outOfStock || 0}</CardValue>
            </div>
          </div>
        </Card>
        <Card variant="warning">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-amber-500" />
            <div>
              <CardTitle className="text-sm">Abaixo do mínimo</CardTitle>
              <CardValue className="text-amber-600">{summary?.belowMinimum || 0}</CardValue>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4">Movimentação mensal</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthly || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="entries" name="Entradas" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exits" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle className="mb-4">Entradas (30 dias)</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={entries || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} tickFormatter={(v) => v.slice(5)} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="quantity" name="Quantidade" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4">Últimas movimentações</CardTitle>
          <div className="space-y-3">
            {(summary?.recentMovements || []).slice(0, 8).map((m: {
              id: string;
              type: keyof typeof MOVEMENT_TYPE_LABELS;
              quantity: number;
              createdAt: string;
              product: { name: string };
            }) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div>
                  <p className="font-medium">{m.product?.name}</p>
                  <p className="text-sm text-slate-500">{MOVEMENT_TYPE_LABELS[m.type]} · {formatDateTime(m.createdAt)}</p>
                </div>
                <Badge variant={m.type === 'ENTRY' ? 'success' : 'danger'}>{m.quantity}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="warning">
          <CardTitle className="mb-4">Lista de compras automática</CardTitle>
          <div className="space-y-3">
            {(summary?.purchaseList || []).slice(0, 8).map((p: {
              id: string;
              name: string;
              currentQuantity: number;
              minQuantity: number;
              needed: number;
            }) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-amber-100 last:border-0">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-slate-500">Atual: {p.currentQuantity} / Mín: {p.minQuantity}</p>
                </div>
                <Badge variant="warning">+{p.needed}</Badge>
              </div>
            ))}
            {(!summary?.purchaseList || summary.purchaseList.length === 0) && (
              <p className="text-slate-500 text-center py-4">Nenhum produto abaixo do mínimo</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
