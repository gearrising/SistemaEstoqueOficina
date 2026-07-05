import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Tags,
  Truck,
  ShoppingCart,
  ArrowLeftRight,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  Bell,
  Search,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início', permission: 'dashboard:read' },
  { to: '/estoque', icon: Boxes, label: 'Estoque', permission: 'stock:read' },
  { to: '/produtos', icon: Package, label: 'Produtos', permission: 'products:read' },
  { to: '/categorias', icon: Tags, label: 'Categorias', permission: 'categories:read' },
  { to: '/fornecedores', icon: Truck, label: 'Fornecedores', permission: 'suppliers:read' },
  { to: '/compras', icon: ShoppingCart, label: 'Compras', permission: 'purchases:read' },
  { to: '/movimentacoes', icon: ArrowLeftRight, label: 'Movimentar', permission: 'movements:read' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios', permission: 'reports:read' },
  { to: '/usuarios', icon: Users, label: 'Usuários', permission: 'users:read' },
  { to: '/configuracoes', icon: Settings, label: 'Config', permission: 'settings:read' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: notifCount } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/notifications/count').then((r) => r.data.count),
    refetchInterval: 30000,
  });

  const filteredNav = navItems.filter((item) => hasPermission(item.permission));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/produtos?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Desktop */}
      <aside className="no-print hidden md:flex w-24 lg:w-28 flex-col items-center py-6 bg-white dark:bg-slate-900 border-r-2 border-slate-200 dark:border-slate-800 fixed h-full z-40">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-xl">
            E
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-2 w-full px-2">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                )
              }
            >
              <item.icon className="h-7 w-7" />
              <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => logout()}
          className="flex flex-col items-center gap-1 py-3 text-slate-500 hover:text-red-500"
        >
          <LogOut className="h-6 w-6" />
          <span className="text-xs">Sair</span>
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-24 lg:ml-28 flex flex-col min-h-screen">
        <header className="no-print sticky top-0 z-30 flex items-center gap-4 px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b-2 border-slate-200 dark:border-slate-800">
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="h-6 w-6" />
          </button>

          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border-2 border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 focus:border-primary focus:outline-none"
            />
          </form>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
              <Bell className="h-5 w-5" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {notifCount}
                </span>
              )}
            </button>
            <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
          </div>
        </header>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-64 h-full bg-white dark:bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
              <nav className="flex flex-col gap-2 mt-8">
                {filteredNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>

        {/* Bottom nav mobile */}
        <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 z-30 flex justify-around items-center py-2 bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800">
          {filteredNav.slice(0, 4).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn('flex flex-col items-center p-2', isActive ? 'text-primary' : 'text-slate-500')
              }
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}
          <button onClick={() => setMobileMenuOpen(true)} className="flex flex-col items-center p-2 text-slate-500">
            <Menu className="h-6 w-6" />
            <span className="text-xs mt-1">Mais</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
