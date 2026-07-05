import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stockLocationSchema, type StockLocationInput } from '@estoque/shared';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { DialogRoot, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type StockLocationRow = StockLocationInput & {
  id: string;
  _count?: { balances: number };
};

export function StockLocationsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockLocationRow | null>(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('stock:write');

  const { data, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/stock/locations').then((r) => r.data),
  });

  const form = useForm<StockLocationInput>({
    resolver: zodResolver(stockLocationSchema),
    defaultValues: { isDefault: false },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: StockLocationInput) =>
      editing
        ? api.put(`/stock/locations/${editing.id}`, payload)
        : api.post('/stock/locations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setOpen(false);
      setEditing(null);
      form.reset({ name: '', description: '', isDefault: false });
      toast.success(editing ? 'Local de estoque atualizado' : 'Local de estoque criado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/stock/locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Local de estoque excluído');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openEdit = (location: StockLocationRow) => {
    setEditing(location);
    form.reset({
      name: location.name,
      description: location.description ?? '',
      isDefault: location.isDefault,
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', description: '', isDefault: false });
    setOpen(true);
  };

  const filtered = (data || []).filter((loc: StockLocationRow) =>
    !search ||
    loc.name.toLowerCase().includes(search.toLowerCase()) ||
    loc.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/estoque">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Locais de estoque</h1>
        </div>
        <div className="flex gap-3">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <DialogRoot open={open} onOpenChange={setOpen}>
            {canWrite && (
              <DialogTrigger asChild>
                <Button onClick={openCreate}><Plus className="h-5 w-5" /> Novo</Button>
              </DialogTrigger>
            )}
            <DialogContent title={editing ? 'Editar local de estoque' : 'Novo local de estoque'}>
              <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input {...form.register('name')} placeholder="Ex.: Almoxarifado Principal" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea {...form.register('description')} placeholder="Opcional" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...form.register('isDefault')} className="h-4 w-4" />
                  <span>Local de estoque padrão</span>
                </label>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  Salvar
                </Button>
              </form>
            </DialogContent>
          </DialogRoot>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !filtered.length ? (
        <EmptyState message="Nenhum local de estoque cadastrado" />
      ) : (
        <div className="grid gap-3">
          {filtered.map((loc: StockLocationRow) => (
            <div
              key={loc.id}
              className="flex items-center justify-between p-4 rounded-2xl border-2 bg-white dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg">{loc.name}</p>
                  {loc.isDefault && <Badge variant="success">Padrão</Badge>}
                </div>
                {loc.description && (
                  <p className="text-sm text-slate-500 mt-1">{loc.description}</p>
                )}
              </div>
              {canWrite && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}>
                    <Pencil className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(loc.id)}>
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
