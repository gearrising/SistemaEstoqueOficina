import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardTitle } from '@/components/ui/card';
import { LoadingSpinner, Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDateTime } from '@/lib/utils';
import { Database, Moon, Sun, Save } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [companyName, setCompanyName] = useState('');
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => {
      setCompanyName(r.data.company_name || '');
      return r.data;
    }),
  });

  const { data: backups } = useQuery({
    queryKey: ['backups'],
    queryFn: () => api.get('/backups').then((r) => r.data),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/settings/audit-logs', { params: { limit: 20 } }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/settings', { company_name: companyName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Configurações salvas');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const backupMutation = useMutation({
    mutationFn: () => api.post('/backups'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Backup criado');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold">Configurações</h1>

      <Card>
        <CardTitle className="mb-4">Geral</CardTitle>
        <div className="space-y-4">
          <div>
            <Label>Nome da empresa</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <Button onClick={() => saveMutation.mutate()}><Save className="h-5 w-5" /> Salvar</Button>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-4">Aparência</CardTitle>
        <Button variant="outline" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
        </Button>
      </Card>

      <Card>
        <CardTitle className="mb-4">Backup</CardTitle>
        <Button onClick={() => backupMutation.mutate()} disabled={backupMutation.isPending}>
          <Database className="h-5 w-5" /> Criar backup manual
        </Button>
        <div className="mt-4 space-y-2">
          {backups?.map((b: { id: string; filename: string; status: string; createdAt: string; size: number }) => (
            <div key={b.id} className="flex justify-between text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span>{b.filename}</span>
              <div className="flex gap-2 items-center">
                <Badge variant={b.status === 'SUCCESS' ? 'success' : 'danger'}>{b.status}</Badge>
                <span className="text-slate-500">{formatDateTime(b.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-4">Logs de auditoria</CardTitle>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {auditLogs?.items?.map((log: {
            id: string; action: string; entity: string; createdAt: string;
            user?: { name: string };
          }) => (
            <div key={log.id} className="text-sm p-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-medium">{log.user?.name || 'Sistema'}</span>
              {' · '}{log.action} {log.entity}
              <span className="text-slate-500 ml-2">{formatDateTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
