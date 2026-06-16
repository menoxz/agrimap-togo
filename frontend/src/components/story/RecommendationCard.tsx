import Badge from '@/components/ui/Badge';

interface RecommendationCardProps {
  title: string;
  description: string;
  priority: string;
  region: string;
}

function getPriorityVariant(priority: string): 'error' | 'warning' | 'default' {
  const p = priority.toLowerCase();
  if (p === 'élevée' || p === 'high' || p === 'haute') return 'error';
  if (p === 'moyenne' || p === 'medium') return 'warning';
  return 'default';
}

function getPriorityLabel(priority: string): string {
  const p = priority.toLowerCase();
  if (p === 'élevée' || p === 'high' || p === 'haute') return 'Priorité Haute';
  if (p === 'moyenne' || p === 'medium') return 'Priorité Moyenne';
  return priority;
}

/**
 * RecommendationCard — Thème clair, sans bordure colorée.
 */
export default function RecommendationCard({
  title,
  description,
  priority,
  region,
}: RecommendationCardProps) {
  const variant = getPriorityVariant(priority);
  const label   = getPriorityLabel(priority);

  return (
    <div
      className="rounded-xl bg-white/80 shadow-sm p-5 flex flex-col gap-2
                 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <h3 className="text-gray-900 font-bold text-sm leading-snug">{title}</h3>
        <Badge variant={variant} size="sm">{label}</Badge>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
      <p className="text-gray-400 text-xs font-medium mt-auto pt-1">{region}</p>
    </div>
  );
}
