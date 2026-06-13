import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva('btn', {
  variants: {
    variant: {
      primary: 'btn-primary',
      default: 'btn-default',
      ghost:   'btn-ghost',
      danger:  'btn-danger',
      icon:    'btn-icon',
    },
    size: {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="animate-spin" aria-hidden="true" size={16} />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
