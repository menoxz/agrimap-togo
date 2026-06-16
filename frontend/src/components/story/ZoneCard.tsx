import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

interface ZoneCardProps {
  title: string;
  subtitle?: string;
  indicators: Record<string, string>;
  priority?: 'Élevée' | 'Haute' | 'Moyenne' | 'High' | 'Medium';
}

function getPriorityVariant(priority?: string): 'error' | 'warning' | 'success' | 'default' {
  if (!priority) return 'default';
  const p = priority.toLowerCase();
  if (p === 'élevée' || p === 'high' || p === 'haute') return 'error';
  if (p === 'moyenne' || p === 'medium') return 'warning';
  return 'default';
}

function getPriorityLabel(priority?: string): string {
  if (!priority) return '';
  const p = priority.toLowerCase();
  if (p === 'élevée' || p === 'high' || p === 'haute') return 'Haute priorité';
  if (p === 'moyenne' || p === 'medium') return 'Priorité moyenne';
  return priority;
}

/**
 * ZoneCard — Displays information about a priority zone.
 * Includes title, region subtitle, key indicators, and priority badge.
 * Print-friendly: masquer tout sauf la carte via CSS (class .zone-card)
 */
export default function ZoneCard({
  title,
  subtitle,
  indicators,
  priority,
}: ZoneCardProps) {
  const variant = getPriorityVariant(priority);
  const label = getPriorityLabel(priority);

  return (
    <Card
      variant="default"
      padding="md"
      className="zone-card card-hover-lift print:border print:border-gray-300 print:shadow-none print:bg-white print:text-black"
    >
      <div className="flex flex-col gap-3">
        {/* Header with priority badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-h4 font-bold text-text print:text-black">
              {title}
            </h3>
            {subtitle && (
              <p className="text-body-sm text-text-secondary print:text-gray-700 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {priority && (
            <Badge variant={variant} size="md">
              {label}
            </Badge>
          )}
        </div>

        {/* Indicators */}
        {Object.keys(indicators).length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(indicators).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <span className="text-caption text-muted print:text-gray-600 uppercase tracking-wide">
                  {key}
                </span>
                <span className="text-body-sm font-semibold text-text print:text-black">
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
