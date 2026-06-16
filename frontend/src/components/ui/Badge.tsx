import { type LucideIcon } from 'lucide-react';
import { type HTMLAttributes, forwardRef } from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'primary';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: LucideIcon;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-text-secondary',
  success: 'bg-green-100 text-success',
  warning: 'bg-orange-100 text-warning',
  error: 'bg-red-100 text-error',
  info: 'bg-blue-100 text-info',
  primary: 'bg-primary-light text-primary',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'h-5 text-caption px-1.5',
  md: 'h-6 text-body-sm px-3',
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      icon: Icon,
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim()}
        {...props}
      >
        {Icon && <Icon size={size === 'sm' ? 12 : 16} className="shrink-0" />}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
export default Badge;
