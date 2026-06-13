import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const sizeMap: Record<ModalSize, string> = {
  sm:   'sm:max-w-sm',
  md:   'sm:max-w-md',
  lg:   'sm:max-w-2xl',
  xl:   'sm:max-w-4xl',
  full: 'sm:max-w-[min(96vw,72rem)]',
};

export interface ModalProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  title?:        string;
  description?:  string;
  children:      React.ReactNode;
  footer?:       React.ReactNode;
  size?:         ModalSize;
  className?:    string;
}

const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/25 backdrop-blur-sm',
            'data-[state=open]:animate-fade-in',
            'data-[state=closed]:animate-fade-out'
          )}
        />

        {/* Content panel */}
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] card-elevated flex flex-col',
            'max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] overflow-hidden',
            'rounded-lg outline-none',
            'data-[state=open]:animate-modal-scale-in',
            'data-[state=closed]:animate-modal-scale-out',
            sizeMap[size],
            className
          )}
        >
          {/* Header */}
          {(title || description) && (
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border-1 shrink-0">
              <div className="min-w-0">
                {title && (
                  <Dialog.Title className="text-section-title text-ink-1 font-semibold break-words">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="text-sm text-ink-3 mt-0.5 break-words">
                    {description}
                  </Dialog.Description>
                )}
              </div>

              <Dialog.Close asChild>
                <button
                  type="button"
                  className="btn-icon shrink-0 -mr-1"
                  aria-label="Đóng"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
          )}

          {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 min-h-0">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex flex-col-reverse gap-2 px-4 py-3 border-t border-border-1 shrink-0 sm:flex-row sm:items-center sm:justify-end sm:px-5">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

Modal.displayName = 'Modal';

export { Modal };
