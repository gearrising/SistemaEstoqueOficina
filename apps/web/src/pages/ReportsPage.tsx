import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/badge';
import { FileText, FileSpreadsheet, Printer, Download } from 'lucide-react';

export function ReportsPage() {
  const { data: types, isLoading } = useQuery({
    queryKey: ['report-types'],
    queryFn: () => api.get('/reports/types').then((r) => r.data),
  });

  const download = (type: string, format: string) => {
    const token = localStorage.getItem('accessToken');
    const url = `${import.meta.env.VITE_API_URL || '/api'}/reports/${type}?format=${format}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio-${type}.${format}`);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        link.href = URL.createObjectURL(blob);
        link.click();
      });
  };

  const print = (type: string) => {
    const token = localStorage.getItem('accessToken');
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/reports/${type}?format=json`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<html><head><title>Relatório</title></head><body>`);
        win.document.write(`<h1>Relatório: ${type}</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
        win.document.write('</body></html>');
        win.print();
      });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types?.map((report: { id: string; label: string }) => (
          <Card key={report.id}>
            <CardTitle className="mb-4">{report.label}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => download(report.id, 'pdf')}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => download(report.id, 'xlsx')}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => download(report.id, 'csv')}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button size="sm" variant="ghost" onClick={() => print(report.id)}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
