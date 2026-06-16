import React from 'react';

interface TogoPatternDividerProps {
  color?: 'green' | 'yellow' | 'red';
  className?: string;
}

const colorValues: Record<'green' | 'yellow' | 'red', string> = {
  green:  'rgba(0, 106, 78, 0.18)',
  yellow: 'rgba(255, 209, 0, 0.20)',
  red:    'rgba(210, 16, 52, 0.18)',
};

export function TogoPatternDivider({ color = 'green', className = '' }: TogoPatternDividerProps) {
  const c: string = colorValues[color];
  const stops: string = 'transparent, transparent 6px, ' + c + ' 6px, ' + c + ' 7px';
  const bg: string =
    'repeating-linear-gradient(45deg, ' + stops + '), ' +
    'repeating-linear-gradient(-45deg, ' + stops + ')';
  const cn: string = 'h-8 w-full' + (className ? ' ' + className : '');
  return (
    <div
      aria-hidden="true"
      className={cn}
      style={{ backgroundImage: bg, backgroundColor: '#FAFAF5' }}
    />
  );
}
