import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export function StockPage() {
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');

  const params: Record<string, string | boolean> = {};
  if (filter === 'low') params.lowStock = true;
  if (filter === 'out') params.outOfStock = true;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stock', filter],
    queryFn: () => api.get('/stock', { params: { ...params, limit: 100 } }).then((r) => r.data),
  });

  const items = (data?.items || []).filter((i: { name: string; internalCode: string }) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.internalCode.includes(search)
  );

  const statusBadge = (status: string) => {
    if (status === 'out') return <Badge variant="danger">Em falta</Badge>;
    if (status === 'low') return <Badge variant="warning">Mínimo</Badge>;
    return <Badge variant="success">OK</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Estoque</h1>
        <Button variant="outline" onClick={() => refetch()}>Atualizar</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'low', 'out'] as const).map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f === 'all' ? 'Todos' : f === 'low' ? 'Abaixo do mínimo' : 'Em falta'}
          </Button>
        ))}
      </div>

      <Input placeholder="Filtrar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />

      {isLoading ? <LoadingSpinner /> : !items.length ? <EmptyState message="Nenhum item" /> : (
        <div className="overflow-x-auto rounded-2xl border-2 bg-white dark:bg-slate-900">
          <table className="w-full text-left">
            <thead className="border-b-2 bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="p-4 font-semibold">Produto</th>
                <th className="p-4 font-semibold hidden sm:table-cell">Código</th>
                <th className="p-4 font-semibold">Qtd</th>
                <th className="p-4 font-semibold hidden md:table-cell">Mín</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Valor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: {
                id: string; name: string; internalCode: string; currentQuantity: number;
                minQuantity: number; salePrice: number; status: string;
              }) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4 hidden sm:table-cell text-slate-500">{item.internalCode}</td>
                  <td className="p-4 font-bold text-lg">{item.currentQuantity}</td>
                  <td className="p-4 hidden md:table-cell">{item.minQuantity}</td>
                  <td className="p-4">{statusBadge(item.status)}</td>
                  <td className="p-4 hidden lg:table-cell">{formatCurrency(item.currentQuantity * item.salePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
