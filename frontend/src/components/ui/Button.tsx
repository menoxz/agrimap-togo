import { type LucideIcon, Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'filled' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonColor = 'primary' | 'secondary' | 'accent';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, Record<ButtonColor, string>> = {
  filled: {
    primary:
      'bg-primary text-white border-none hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm active:brightness-95',
    secondary:
      'bg-secondary text-white border-none hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm active:brightness-95',
    accent:
      'bg-accent text-white border-none hover:bg-orange-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm active:brightness-95',
  },
  outline: {
    primary:
      'bg-transparent text-primary border-2 border-primary hover:bg-primary-light hover:-translate-y-0.5 active:translate-y-0 active:bg-primary/10',
    secondary:
      'bg-transparent text-secondary border-2 border-secondary hover:bg-secondary-light hover:-translate-y-0.5 active:translate-y-0 active:bg-secondary/10',
    accent:
      'bg-transparent text-accent border-2 border-accent hover:bg-accent-light hover:-translate-y-0.5 active:translate-y-0 active:bg-accent/10',
  },
  ghost: {
    primary:
      'bg-transparent text-text hover:bg-surface-alt active:bg-gray-200',
    secondary:
      'bg-transparent text-text hover:bg-surface-alt active:bg-gray-200',
    accent:
      'bg-transparent text-accent hover:bg-accent-light active:bg-accent/10',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-label gap-1',
  md: 'h-11 px-5 text-body gap-2',
  lg: 'h-14 px-7 text-body-lg gap-3',
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'filled',
      size = 'md',
      color = 'primary',
      icon: IconLeft,
      iconRight: IconRight,
      loading = false,
      disabled = false,
      fullWidth = false,
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    const base = [
      'inline-flex items-center justify-center font-semibold rounded-md',
      'transition-all duration-200 ease-out',
      'focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed disabled:pointer-events-none',
      variantStyles[variant][color],
    ];

    if (disabled && variant === 'filled') {
      base.push('bg-gray-300 text-gray-500');
    } else if (disabled && variant === 'outline') {
      base.push('border-gray-300 text-gray-400');
    } else if (disabled && variant === 'ghost') {
      base.push('text-muted');
    }

    if (fullWidth) {
      base.push('w-full');
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base.join(' ')} ${className}`.trim()}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSizes[size]} className="animate-spin shrink-0" />
        ) : IconLeft ? (
          <IconLeft size={iconSizes[size]} className="shrink-0" />
        ) : null}
        <span>{children}</span>
        {!loading && IconRight && (
          <IconRight size={iconSizes[size]} className="shrink-0" />
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
