import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categorySchema, type CategoryInput } from '@estoque/shared';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { DialogRoot, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { LoadingSpinner, EmptyState } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function CategoriesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string } & CategoryInput | null>(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('categories:write');

  const { data, isLoading } = useQuery({
    queryKey: ['categories', search],
    queryFn: () => api.get('/categories', { params: { search } }).then((r) => r.data),
  });

  const form = useForm<CategoryInput>({ resolver: zodResolver(categorySchema) });

  const saveMutation = useMutation({
    mutationFn: (data: CategoryInput) =>
      editing ? api.put(`/categories/${editing.id}`, data) : api.post('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setOpen(false);
      setEditing(null);
      form.reset();
      toast.success(editing ? 'Categoria atualizada' : 'Categoria criada');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria excluída');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openEdit = (cat: { id: string; name: string; description?: string }) => {
    setEditing(cat);
    form.reset({ name: cat.name, description: cat.description });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', description: '' });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Categorias</h1>
        <div className="flex gap-3">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <DialogRoot open={open} onOpenChange={setOpen}>
            {canWrite && (
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-5 w-5" /> Nova</Button>
            </DialogTrigger>
            )}
            <DialogContent title={editing ? 'Editar categoria' : 'Nova categoria'}>
              <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input {...form.register('name')} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea {...form.register('description')} />
                </div>
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
      ) : !data?.length ? (
        <EmptyState message="Nenhuma categoria cadastrada" />
      ) : (
        <div className="grid gap-3">
          {data.map((cat: { id: string; name: string; description?: string; _count: { products: number } }) => (
            <div key={cat.id} className="flex items-center justify-between p-4 rounded-2xl border-2 bg-white dark:bg-slate-900">
              <div>
                <p className="font-semibold text-lg">{cat.name}</p>
                <p className="text-sm text-slate-500">{cat._count.products} produtos</p>
              </div>
              {canWrite && (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(cat.id)}><Trash2 className="h-5 w-5 text-red-500" /></Button>
              </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
