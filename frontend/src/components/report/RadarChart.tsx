import { useTranslation } from '@/hooks/useTranslation';

interface PrefectureData {
  nom_prefecture: string;
  region: string;
  density_score: number;
  accessibility_score: number;
  coop_score: number;
  zaap_score: number;
  synthesis_score: number;
}

interface RadarChartProps {
  prefecture: PrefectureData;
  regionAverages: {
    density_score: number;
    accessibility_score: number;
    coop_score: number;
    zaap_score: number;
  };
}

const AXIS_LABELS = [
  { key: 'density' as const, angle: -90 },
  { key: 'access' as const, angle: 0 },
  { key: 'coop' as const, angle: 90 },
  { key: 'zaap' as const, angle: 180 },
];

const PREF_COLOR = '#2563EB';
const REGION_COLOR = '#9CA3AF';

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function buildPolygonPoints(
  cx: number,
  cy: number,
  maxRadius: number,
  values: [number, number, number, number],
): string {
  const angles = [-90, 0, 90, 180];
  return angles
    .map((angle, i) => {
      const r = (values[i] / 100) * maxRadius;
      const pt = polarToCartesian(cx, cy, r, angle);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');
}

export default function RadarChart({ prefecture, regionAverages }: RadarChartProps) {
  const { t } = useTranslation();
  const SIZE = 240;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const MAX_R = 90;

  const prefValues: [number, number, number, number] = [
    Math.round(prefecture.density_score),
    Math.round(prefecture.accessibility_score),
    Math.round(prefecture.coop_score),
    Math.round(prefecture.zaap_score),
  ];

  const regValues: [number, number, number, number] = [
    Math.round(regionAverages.density_score),
    Math.round(regionAverages.accessibility_score),
    Math.round(regionAverages.coop_score),
    Math.round(regionAverages.zaap_score),
  ];

  const rings = [25, 50, 75, 100];

  return (
    <div className="flex flex-col items-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="shrink-0"
        role="img"
        aria-label={t('report:radar.title', { prefecture: prefecture.nom_prefecture })}
      >
        {/* Scale rings */}
        {rings.map((val) => {
          const r = (val / 100) * MAX_R;
          return (
            <circle
              key={val}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {AXIS_LABELS.map(({ angle }) => {
          const end = polarToCartesian(CX, CY, MAX_R, angle);
          return (
            <line
              key={angle}
              x1={CX}
              y1={CY}
              x2={end.x}
              y2={end.y}
              stroke="#D1D5DB"
              strokeWidth={1}
            />
          );
        })}

        {/* Region average polygon (dashed) */}
        <polygon
          points={buildPolygonPoints(CX, CY, MAX_R, regValues)}
          fill="none"
          stroke={REGION_COLOR}
          strokeWidth={2}
          strokeDasharray="4 3"
        />

        {/* Prefecture polygon */}
        <polygon
          points={buildPolygonPoints(CX, CY, MAX_R, prefValues)}
          fill={PREF_COLOR}
          fillOpacity={0.12}
          stroke={PREF_COLOR}
          strokeWidth={2.5}
        />

        {/* Axis labels */}
        {AXIS_LABELS.map(({ key, angle }) => {
          const labelPt = polarToCartesian(CX, CY, MAX_R + 18, angle);
          return (
            <text
              key={key}
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-text-secondary text-[10px]"
              style={{ fontFamily: 'inherit' }}
            >
              {t(`report:radar.${key}`)}
            </text>
          );
        })}

        {/* Score values at vertices */}
        {AXIS_LABELS.map(({ key, angle }, i) => {
          const r = (prefValues[i] / 100) * MAX_R;
          const pt = polarToCartesian(CX, CY, r, angle);
          const offset = polarToCartesian(CX, CY, r + 14, angle);
          return (
            <text
              key={`val-${key}`}
              x={offset.x}
              y={offset.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-primary text-[9px] font-bold"
              style={{ fontFamily: 'inherit' }}
            >
              {prefValues[i]}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2 text-body-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-[3px] rounded-sm"
            style={{ backgroundColor: PREF_COLOR }}
          />
          <span>{t('report:radar.prefecture')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-[3px] rounded-sm"
            style={{
              backgroundColor: REGION_COLOR,
              backgroundImage:
                'repeating-linear-gradient(90deg, #9CA3AF 0, #9CA3AF 3px, transparent 3px, transparent 6px)',
            }}
          />
          <span>{t('report:radar.region_avg')}</span>
        </div>
      </div>
    </div>
  );
}
