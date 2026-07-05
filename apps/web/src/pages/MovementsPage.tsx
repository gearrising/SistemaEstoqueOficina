import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MOVEMENT_TYPES, MOVEMENT_TYPE_LABELS, type MovementType } from '@estoque/shared';
import { api, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import {
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Settings2, ClipboardList,
  AlertTriangle, Trash2, Wrench, RotateCcw, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const TYPE_ICONS: Record<MovementType, React.ElementType> = {
  ENTRY: ArrowDownCircle,
  EXIT: ArrowUpCircle,
  TRANSFER: ArrowLeftRight,
  ADJUSTMENT: Settings2,
  MANUAL_CORRECTION: Settings2,
  INVENTORY: ClipboardList,
  LOSS: AlertTriangle,
  BREAKAGE: Trash2,
  INTERNAL_CONSUMPTION: Wrench,
  RETURN: RotateCcw,
  EXCHANGE: RefreshCw,
};

const QUICK_TYPES: MovementType[] = ['ENTRY', 'EXIT', 'INTERNAL_CONSUMPTION', 'TRANSFER'];

export function MovementsPage() {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<MovementType | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [observation, setObservation] = useState('');
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => api.get('/products/search', { params: { q: productSearch } }).then((r) => r.data),
    enabled: productSearch.length >= 2,
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/stock/locations').then((r) => r.data),
  });

  const [locationId, setLocationId] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');

  const { data: history, isLoading } = useQuery({
    queryKey: ['movements-recent'],
    queryFn: () => api.get('/movements/recent', { params: { limit: 20 } }).then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/movements', {
        type: selectedType,
        productId: selectedProduct!.id,
        locationId: locationId || locations?.[0]?.id,
        targetLocationId: selectedType === 'TRANSFER' ? targetLocationId : undefined,
        quantity: Number(quantity),
        reason,
        observation,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['movements-recent'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      if (res.data.warnings?.length) {
        res.data.warnings.forEach((w: string) => toast.warning(w));
      }
      toast.success('Movimentação registrada');
      resetForm();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const resetForm = () => {
    setStep(1);
    setSelectedType(null);
    setSelectedProduct(null);
    setProductSearch('');
    setQuantity('');
    setReason('');
    setObservation('');
  };

  const selectType = (type: MovementType) => {
    setSelectedType(type);
    setStep(2);
  };

  const selectProduct = (p: { id: string; name: string }) => {
    setSelectedProduct(p);
    setStep(3);
    if (locations?.length) setLocationId(locations.find((l: { isDefault: boolean }) => l.isDefault)?.id || locations[0].id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Movimentar</h1>

      {/* Wizard */}
      <Card className="max-w-2xl mx-auto">
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 w-16 rounded-full ${step >= s ? 'bg-primary' : 'bg-slate-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <CardTitle className="text-center mb-6">O que deseja fazer?</CardTitle>
            <div className="grid grid-cols-2 gap-3">
              {MOVEMENT_TYPES.map((type) => {
                const Icon = TYPE_ICONS[type];
                return (
                  <Button
                    key={type}
                    variant={QUICK_TYPES.includes(type) ? 'default' : 'outline'}
                    className="h-24 flex-col gap-2"
                    onClick={() => selectType(type)}
                  >
                    <Icon className="h-8 w-8" />
                    <span className="text-sm">{MOVEMENT_TYPE_LABELS[type]}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && selectedType && (
          <div>
            <CardTitle className="mb-4">Qual produto?</CardTitle>
            <Input
              placeholder="Digite nome ou código..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              autoFocus
              className="mb-4"
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(products?.items || []).map((p: { id: string; name: string; internalCode: string; currentQuantity: number }) => (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  className="w-full text-left p-4 rounded-xl border-2 hover:border-primary transition-colors"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-slate-500">{p.internalCode} · Estoque: {p.currentQuantity}</p>
                </button>
              ))}
            </div>
            <Button variant="ghost" className="mt-4" onClick={() => setStep(1)}>Voltar</Button>
          </div>
        )}

        {step === 3 && selectedProduct && selectedType && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <p className="text-sm text-slate-500">{MOVEMENT_TYPE_LABELS[selectedType]}</p>
              <p className="font-semibold text-lg">{selectedProduct.name}</p>
            </div>

            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-2xl text-center font-bold h-16"
                autoFocus
              />
            </div>

            {locations && (
              <div>
                <Label>Localização</Label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full h-12 rounded-xl border-2 px-3 dark:bg-slate-900"
                >
                  {locations.map((l: { id: string; name: string }) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedType === 'TRANSFER' && locations && (
              <div>
                <Label>Destino</Label>
                <select
                  value={targetLocationId}
                  onChange={(e) => setTargetLocationId(e.target.value)}
                  className="w-full h-12 rounded-xl border-2 px-3 dark:bg-slate-900"
                >
                  <option value="">Selecione</option>
                  {locations.filter((l: { id: string }) => l.id !== locationId).map((l: { id: string; name: string }) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label>Motivo</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={observation} onChange={(e) => setObservation(e.target.value)} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Voltar</Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={!quantity || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* History */}
      <Card>
        <CardTitle className="mb-4">Histórico recente</CardTitle>
        {isLoading ? <LoadingSpinner /> : (
          <div className="space-y-2">
            {(history?.items || []).map((m: {
              id: string; type: MovementType; quantity: number; createdAt: string;
              product: { name: string }; user: { name: string };
            }) => (
              <div key={m.id} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div>
                  <p className="font-medium">{m.product?.name}</p>
                  <p className="text-sm text-slate-500">
                    {MOVEMENT_TYPE_LABELS[m.type]} · {m.user?.name} · {formatDateTime(m.createdAt)}
                  </p>
                </div>
                <span className="font-bold">{m.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
