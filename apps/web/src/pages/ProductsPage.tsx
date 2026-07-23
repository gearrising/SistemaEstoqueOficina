import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductInput } from '@estoque/shared';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { DialogRoot, DialogContent } from '@/components/ui/dialog';
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/badge';
import { Plus, Package, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type ProductRow = ProductInput & {
  id: string;
  currentQuantity: number;
  imageUrl?: string;
  category?: { id: string; name: string } | null;
  categoryId?: string | null;
  supplierId?: string | null;
};

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('products:write');

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => api.get('/products', { params: { q: search, limit: 50 } }).then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data),
  });

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: { unit: 'UN', status: 'ACTIVE', minQuantity: 0, purchasePrice: 0, salePrice: 0 },
  });

  const saveMutation = useMutation({
    mutationFn: (data: ProductInput) =>
      editing ? api.put(`/products/${editing.id}`, data) : api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      setEditing(null);
      form.reset({ unit: 'UN', status: 'ACTIVE', minQuantity: 0, purchasePrice: 0, salePrice: 0 });
      toast.success(editing ? 'Produto atualizado' : 'Produto criado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto excluído');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ unit: 'UN', status: 'ACTIVE', minQuantity: 0, purchasePrice: 0, salePrice: 0 });
    setOpen(true);
  };

  const openEdit = (product: ProductRow) => {
    setEditing(product);
    form.reset({
      internalCode: product.internalCode,
      barcode: product.barcode ?? '',
      name: product.name,
      description: product.description ?? '',
      categoryId: product.categoryId ?? '',
      brand: product.brand ?? '',
      supplierId: product.supplierId ?? '',
      physicalLocation: product.physicalLocation ?? '',
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      averagePrice: product.averagePrice ?? 0,
      salePrice: product.salePrice,
      minQuantity: product.minQuantity,
      maxQuantity: product.maxQuantity ?? undefined,
      observations: product.observations ?? '',
      status: product.status,
    });
    setOpen(true);
  };

  const statusBadge = (qty: number, min: number) => {
    if (qty === 0) return <Badge variant="danger">Em falta</Badge>;
    if (qty <= min) return <Badge variant="warning">Baixo</Badge>;
    return <Badge variant="success">OK</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Produtos</h1>
        <div className="flex gap-3">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          {canWrite && (
            <Button onClick={openCreate}><Plus className="h-5 w-5" /> Novo</Button>
          )}
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : !data?.items?.length ? <EmptyState message="Nenhum produto" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p: ProductRow) => (
            <div key={p.id} className="rounded-2xl border-2 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-12 w-12 text-slate-300" />
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-slate-500">{p.internalCode}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {statusBadge(p.currentQuantity, p.minQuantity)}
                    {canWrite && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Qtd: <strong>{p.currentQuantity}</strong></span>
                  <span>{formatCurrency(p.salePrice)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{p.category?.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogContent title={editing ? 'Editar produto' : 'Novo produto'} className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código interno</Label><Input {...form.register('internalCode')} /></div>
              <div><Label>Código de barras</Label><Input {...form.register('barcode')} /></div>
            </div>
            <div><Label>Nome</Label><Input {...form.register('name')} /></div>
            <div><Label>Descrição</Label><Textarea {...form.register('description')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <select {...form.register('categoryId')} className="w-full h-12 rounded-xl border-2 px-3 dark:bg-slate-900">
                  <option value="">Nenhuma</option>
                  {categories?.map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Fornecedor</Label>
                <select {...form.register('supplierId')} className="w-full h-12 rounded-xl border-2 px-3 dark:bg-slate-900">
                  <option value="">Nenhum</option>
                  {suppliers?.map((s: { id: string; legalName: string }) => (
                    <option key={s.id} value={s.id}>{s.legalName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Marca</Label><Input {...form.register('brand')} /></div>
              <div><Label>Unidade</Label><Input {...form.register('unit')} /></div>
              <div><Label>Posição física</Label><Input {...form.register('physicalLocation')} placeholder="Ex.: Prateleira A3" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Preço compra</Label><Input type="number" step="0.01" {...form.register('purchasePrice')} /></div>
              <div><Label>Preço venda</Label><Input type="number" step="0.01" {...form.register('salePrice')} /></div>
              <div><Label>Qtd mínima</Label><Input type="number" {...form.register('minQuantity')} /></div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={saveMutation.isPending}>
              Salvar produto
            </Button>
          </form>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
