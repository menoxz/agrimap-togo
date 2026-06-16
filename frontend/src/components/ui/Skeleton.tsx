import { forwardRef } from 'react';

type SkeletonVariant = 'text' | 'card' | 'circle' | 'map';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  lines?: number;
}

const variantDefaults: Record<SkeletonVariant, { width: string; height: string }> = {
  text: { width: '100%', height: '16px' },
  card: { width: '100%', height: '120px' },
  circle: { width: '44px', height: '44px' },
  map: { width: '100%', height: '400px' },
};

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'text', width, height, lines = 1 }, ref) => {
    const defaults = variantDefaults[variant];
    const w = width ?? defaults.width;
    const h = height ?? defaults.height;

    const baseClass = 'bg-gray-200 animate-pulse';
    const shapeClass =
      variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded-sm' : 'rounded-md';

    if (variant === 'text' && lines > 1) {
      return (
        <div ref={ref} className="flex flex-col gap-2" role="status" aria-label="Chargement">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`${baseClass} ${shapeClass}`}
              style={{
                width: i === lines - 1 ? '60%' : w,
                height: h,
              }}
            />
          ))}
          <span className="sr-only">Chargement...</span>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={`${baseClass} ${shapeClass}`}
        style={{ width: w, height: h }}
        role="status"
        aria-label="Chargement"
      >
        <span className="sr-only">Chargement...</span>
      </div>
    );
  },
);

Skeleton.displayName = 'Skeleton';
export default Skeleton;
