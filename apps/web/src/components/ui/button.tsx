import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-blue-700',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border-2 border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100',
        ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800',
        success: 'bg-green-500 text-white hover:bg-green-600',
        warning: 'bg-amber-500 text-white hover:bg-amber-600',
      },
      size: {
        default: 'h-12 px-6',
        sm: 'h-10 px-4 text-sm',
        lg: 'h-14 px-8 text-lg',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
