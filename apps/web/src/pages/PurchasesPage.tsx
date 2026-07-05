import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PURCHASE_STATUS_LABELS, type PurchaseStatus } from '@estoque/shared';
import { api, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge, LoadingSpinner, EmptyState } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function PurchasesPage() {
  const [tab, setTab] = useState<'orders' | 'suggestions' | 'list'>('orders');
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases').then((r) => r.data),
    enabled: tab === 'orders',
  });

  const { data: suggestions } = useQuery({
    queryKey: ['purchase-suggestions'],
    queryFn: () => api.get('/purchases/suggestions').then((r) => r.data),
    enabled: tab === 'suggestions',
  });

  const { data: purchaseList } = useQuery({
    queryKey: ['purchase-list'],
    queryFn: () => api.get('/purchases/purchase-list').then((r) => r.data),
    enabled: tab === 'list',
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/purchases/suggestions/generate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-suggestions'] });
      toast.success('Sugestões geradas');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const statusVariant = (status: PurchaseStatus) => {
    const map: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'secondary'> = {
      DRAFT: 'secondary', BUDGET: 'default', ORDERED: 'warning', PARTIAL: 'warning', RECEIVED: 'success', CANCELLED: 'danger',
    };
    return map[status] || 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Compras</h1>
        <Button><Plus className="h-5 w-5" /> Novo pedido</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['orders', 'suggestions', 'list'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" onClick={() => setTab(t)}>
            {t === 'orders' ? 'Pedidos' : t === 'suggestions' ? 'Sugestões' : 'Lista automática'}
          </Button>
        ))}
      </div>

      {tab === 'orders' && (
        isLoading ? <LoadingSpinner /> : !orders?.length ? <EmptyState message="Nenhum pedido" /> : (
          <div className="space-y-3">
            {orders.map((o: {
              id: string; status: PurchaseStatus; totalAmount: number; createdAt: string;
              supplier: { legalName: string }; _count: { items: number };
            }) => (
              <Card key={o.id}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{o.supplier?.legalName}</p>
                    <p className="text-sm text-slate-500">{o._count.items} itens · {formatDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusVariant(o.status)}>{PURCHASE_STATUS_LABELS[o.status]}</Badge>
                    <p className="font-bold mt-1">{formatCurrency(o.totalAmount)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'suggestions' && (
        <div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="mb-4">
            <Sparkles className="h-5 w-5" /> Gerar sugestões
          </Button>
          {!suggestions?.length ? <EmptyState message="Gere sugestões para ver recomendações" /> : (
            <div className="space-y-3">
              {suggestions.map((s: {
                id: string; suggestedQty: number; currentStock: number;
                avgConsumption30: number; leadTimeDays: number;
                product: { name: string; internalCode: string; supplier?: { legalName: string } };
              }) => (
                <Card key={s.id}>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{s.product?.name}</p>
                      <p className="text-sm text-slate-500">
                        Estoque: {Number(s.currentStock)} · Consumo/dia: {Number(s.avgConsumption30).toFixed(2)} · Lead: {s.leadTimeDays}d
                      </p>
                      {s.product?.supplier && <p className="text-xs text-slate-400">{s.product.supplier.legalName}</p>}
                    </div>
                    <Badge variant="warning">Comprar {Number(s.suggestedQty).toFixed(0)}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'list' && (
        !purchaseList?.length ? <EmptyState message="Nenhum produto abaixo do mínimo" /> : (
          <div className="space-y-3">
            {purchaseList.map((p: {
              id: string; name: string; currentQuantity: number; minQuantity: number; needed: number; supplier?: string;
            }) => (
              <Card key={p.id} variant="warning">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm">Atual: {p.currentQuantity} / Mín: {p.minQuantity}</p>
                  </div>
                  <Badge variant="danger">+{p.needed}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
