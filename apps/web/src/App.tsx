import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { StockPage } from '@/pages/StockPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { SuppliersPage } from '@/pages/SuppliersPage';
import { PurchasesPage } from '@/pages/PurchasesPage';
import { MovementsPage } from '@/pages/MovementsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { UsersPage } from '@/pages/UsersPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { getSocket } from '@/lib/socket';
import { LoadingSpinner } from '@/components/ui/badge';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function NotificationListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('join', user.id);
    socket.emit('join:all');

    const handlers: [string, (data: { title?: string; message?: string }) => void][] = [
      ['stock:minimum', (d) => toast.warning(d.message || 'Estoque mínimo')],
      ['stock:zero', (d) => toast.error(d.message || 'Estoque zerado')],
      ['purchase:new', (d) => toast.info(d.message || 'Nova compra')],
      ['system:success', (d) => toast.success(d.message || 'Sucesso')],
      ['system:error', (d) => toast.error(d.message || 'Erro')],
    ];

    handlers.forEach(([event, handler]) => socket.on(event, handler));
    return () => {
      handlers.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [user]);

  return null;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner className="min-h-screen" />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <NotificationListener />
              <Routes>
                <Route path="/" element={<ProtectedRoute permission="dashboard:read"><DashboardPage /></ProtectedRoute>} />
                <Route path="/estoque" element={<ProtectedRoute permission="stock:read"><StockPage /></ProtectedRoute>} />
                <Route path="/produtos" element={<ProtectedRoute permission="products:read"><ProductsPage /></ProtectedRoute>} />
                <Route path="/categorias" element={<ProtectedRoute permission="categories:read"><CategoriesPage /></ProtectedRoute>} />
                <Route path="/fornecedores" element={<ProtectedRoute permission="suppliers:read"><SuppliersPage /></ProtectedRoute>} />
                <Route path="/compras" element={<ProtectedRoute permission="purchases:read"><PurchasesPage /></ProtectedRoute>} />
                <Route path="/movimentacoes" element={<ProtectedRoute permission="movements:read"><MovementsPage /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute permission="reports:read"><ReportsPage /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute permission="users:read"><UsersPage /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute permission="settings:read"><SettingsPage /></ProtectedRoute>} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
