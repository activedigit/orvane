import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
        secondary: 'bg-surface text-ink border border-line-2 hover:bg-canvas-2',
        soft: 'bg-primary-soft text-primary hover:bg-primary/15',
        ghost: 'text-ink-2 hover:bg-canvas-2 hover:text-ink',
        destructive: 'bg-danger text-white hover:bg-danger/90',
        outline: 'border border-primary text-primary hover:bg-primary-soft',
        link: 'text-primary underline-offset-4 hover:underline h-auto p-0',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
  if (asChild) {
    return (
      <Slot className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props}>
        {children}
      </Slot>
    );
  }
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="animate-spin" /> : null}
      {children}
    </button>
  );
});
Button.displayName = 'Button';
export { buttonVariants };
