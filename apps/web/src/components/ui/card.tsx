import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'danger' | 'warning' | 'success';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  const variants = {
    default: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    danger: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-900',
    success: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900',
  };
  return (
    <div
      className={cn('rounded-2xl border-2 p-6 shadow-sm', variants[variant], className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold', className)} {...props} />;
}

export function CardValue({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-3xl font-bold mt-2', className)} {...props} />;
}
