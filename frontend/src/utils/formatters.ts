/**
 * Format a number for display with localized separators.
 */
export function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/**
 * Get current data freshness label.
 */
export function getDataFreshness(): string {
  return 'juin 2026';
}
