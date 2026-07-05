import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supplierSchema, type SupplierInput } from '@estoque/shared';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { DialogRoot, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { LoadingSpinner, EmptyState } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function SuppliersPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string } & SupplierInput | null>(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('suppliers:write');

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => api.get('/suppliers', { params: { search } }).then((r) => r.data),
  });

  const form = useForm<SupplierInput>({ resolver: zodResolver(supplierSchema) });

  const saveMutation = useMutation({
    mutationFn: (data: SupplierInput) =>
      editing ? api.put(`/suppliers/${editing.id}`, data) : api.post('/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setOpen(false);
      setEditing(null);
      form.reset();
      toast.success('Fornecedor salvo');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fornecedor excluído');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Fornecedores</h1>
        <div className="flex gap-3">
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <DialogRoot open={open} onOpenChange={setOpen}>
            {canWrite && (
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing(null); form.reset(); }}><Plus className="h-5 w-5" /> Novo</Button>
            </DialogTrigger>
            )}
            <DialogContent title={editing ? 'Editar fornecedor' : 'Novo fornecedor'} className="max-h-[90vh] overflow-y-auto">
              <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-3">
                <div><Label>Razão social</Label><Input {...form.register('legalName')} /></div>
                <div><Label>Nome fantasia</Label><Input {...form.register('tradeName')} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>CNPJ</Label><Input {...form.register('cnpj')} /></div>
                  <div><Label>CPF</Label><Input {...form.register('cpf')} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Telefone</Label><Input {...form.register('phone')} /></div>
                  <div><Label>WhatsApp</Label><Input {...form.register('whatsapp')} /></div>
                </div>
                <div><Label>E-mail</Label><Input type="email" {...form.register('email')} /></div>
                <div><Label>Endereço</Label><Input {...form.register('address')} /></div>
                <div><Label>Contato</Label><Input {...form.register('contact')} /></div>
                <div><Label>Prazo entrega (dias)</Label><Input type="number" {...form.register('leadTimeDays')} /></div>
                <div><Label>Observações</Label><Textarea {...form.register('observations')} /></div>
                <Button type="submit" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </DialogRoot>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : !data?.length ? <EmptyState message="Nenhum fornecedor" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((s: SupplierInput & { id: string }) => (
            <div key={s.id} className="p-4 rounded-2xl border-2 bg-white dark:bg-slate-900">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold text-lg">{s.tradeName || s.legalName}</p>
                  <p className="text-sm text-slate-500">{s.legalName}</p>
                  {s.phone && <p className="text-sm mt-1">{s.phone}</p>}
                </div>
                {canWrite && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(s); form.reset(s); setOpen(true); }}><Pencil className="h-5 w-5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-5 w-5 text-red-500" /></Button>
                </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
