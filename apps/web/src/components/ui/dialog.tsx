import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DialogRoot = Dialog.Root;
export const DialogTrigger = Dialog.Trigger;

export function DialogContent({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <Dialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 bg-white p-6 shadow-xl dark:bg-slate-900',
          className
        )}
      >
        {title && (
          <Dialog.Title className="text-xl font-semibold mb-4">{title}</Dialog.Title>
        )}
        {children}
        <Dialog.Close className="absolute right-4 top-4 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="h-5 w-5" />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
