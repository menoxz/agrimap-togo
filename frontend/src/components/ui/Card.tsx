import { type HTMLAttributes, forwardRef } from 'react';

type CardVariant = 'default' | 'accent' | 'synthesis' | 'problem' | 'solution' | 'impact';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    'bg-surface border border-border shadow-sm',
  accent:
    'bg-accent-light border border-accent/20 shadow-sm',
  synthesis:
    'bg-surface border-l-4 border-accent shadow-sm',
  // Narrative identity variants — Why section (Problème → Solution → Impact)
  problem:
    'bg-togo-red-light border border-togo-red/20 shadow-sm h-full',
  solution:
    'bg-togo-green-light border border-togo-green/20 shadow-sm h-full',
  impact:
    'bg-secondary-light border border-secondary/20 shadow-sm h-full',
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      children,
      className = '',
      onClick,
      ...props
    },
    ref,
  ) => {
    const base = ['rounded-md', variantStyles[variant], paddingStyles[padding]];

    if (hoverable) {
      base.push(
        'transition-all duration-150',
        'hover:shadow-md hover:border-primary/20 hover:cursor-pointer',
        'active:scale-[0.99]',
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
      );
    }

    return (
      <div
        ref={ref}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : undefined
        }
        className={`${base.join(' ')} ${className}`.trim()}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
export default Card;
