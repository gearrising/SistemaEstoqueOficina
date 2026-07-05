import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'danger' | 'warning' | 'success' | 'secondary';

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  const variants = {
    default: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    secondary: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-sm font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
      <p className="text-lg">{message}</p>
    </div>
  );
}
