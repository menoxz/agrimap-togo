import React from 'react';

interface TogoAccentBorderProps {
  width?: 'full' | 'short';
  className?: string;
}

export function TogoAccentBorder({ width = 'short', className = '' }: TogoAccentBorderProps) {
  const widthClass: string = width === 'short' ? 'w-24' : 'w-full';
  const cn: string = 'h-[3px] rounded-full ' + widthClass + (className ? ' ' + className : '');
  return (
    <div
      aria-hidden="true"
      className={cn}
      style={{ background: 'linear-gradient(to right, #006A4E 50%, #FFD100 75%, #D21034 100%)' }}
    />
  );
}
