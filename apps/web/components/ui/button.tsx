import { Slot } from 'radix-ui';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'outline' | 'ghost' | 'inverse';
type Size = 'md' | 'sm' | 'icon' | 'icon-sm';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-foreground hover:brightness-110',
  outline:
    'bg-transparent text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-surface-raised',
  ghost: 'bg-transparent text-secondary-foreground hover:bg-surface-raised hover:text-foreground',
  inverse: 'bg-foreground text-background hover:opacity-90',
};

const sizes: Record<Size, string> = {
  md: 'min-h-10 px-4 text-[14px]',
  sm: 'min-h-9 px-3.5 text-small',
  icon: 'size-10 p-0',
  'icon-sm': 'size-9 p-0',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

/** Botão do Painel 2: sempre em pílula; primário em âmbar, contorno só quando é interação. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', asChild, className, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap no-underline transition-[background-color,color,filter,opacity]',
        'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
