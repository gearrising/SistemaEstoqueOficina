import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserInput } from '@estoque/shared';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { DialogRoot, DialogContent } from '@/components/ui/dialog';
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type UserRow = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role: { id: string; name: string };
};

export function UsersPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('users:write');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/users/roles').then((r) => r.data),
  });

  const form = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: { active: true },
  });

  const saveMutation = useMutation({
    mutationFn: (data: UserInput) =>
      editing ? api.put(`/users/${editing.id}`, data) : api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setEditing(null);
      form.reset({ active: true });
      toast.success(editing ? 'Usuário atualizado' : 'Usuário criado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário excluído');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    GERENTE: 'Gerente',
    ESTOQUISTA: 'Estoquista',
    FUNCIONARIO: 'Funcionário',
  };

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', email: '', password: '', roleId: '', active: true });
    setOpen(true);
  };

  const openEdit = (user: UserRow) => {
    setEditing(user);
    form.reset({
      name: user.name,
      email: user.email,
      password: '',
      roleId: user.role.id,
      active: user.active,
    });
    setOpen(true);
  };

  const onSubmit = (data: UserInput) => {
    if (!editing && !data.password) {
      toast.error('Senha obrigatória para novo usuário');
      return;
    }
    const payload = { ...data };
    if (editing && !payload.password) {
      delete payload.password;
    }
    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">Usuários</h1>
        {canWrite && (
          <Button onClick={openCreate}><Plus className="h-5 w-5" /> Novo</Button>
        )}
      </div>

      {isLoading ? <LoadingSpinner /> : !users?.length ? <EmptyState message="Nenhum usuário" /> : (
        <div className="space-y-3">
          {users.map((u: UserRow) => (
            <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl border-2 bg-white dark:bg-slate-900">
              <div>
                <p className="font-semibold">{u.name}</p>
                <p className="text-sm text-slate-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{roleLabels[u.role.name] || u.role.name}</Badge>
                {!u.active && <Badge variant="danger">Inativo</Badge>}
                {canWrite && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Pencil className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(u.id)}>
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogContent title={editing ? 'Editar usuário' : 'Novo usuário'}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div><Label>Nome</Label><Input {...form.register('name')} /></div>
            <div><Label>E-mail</Label><Input type="email" {...form.register('email')} /></div>
            <div>
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder={editing ? 'Deixe em branco para manter' : ''}
                {...form.register('password')}
              />
            </div>
            <div>
              <Label>Perfil</Label>
              <select {...form.register('roleId')} className="w-full h-12 rounded-xl border-2 px-3 dark:bg-slate-900">
                <option value="">Selecione</option>
                {roles?.map((r: { id: string; name: string }) => (
                  <option key={r.id} value={r.id}>{roleLabels[r.name] || r.name}</option>
                ))}
              </select>
            </div>
            {editing && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...form.register('active')} className="h-4 w-4" />
                <span>Usuário ativo</span>
              </label>
            )}
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              Salvar
            </Button>
          </form>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
