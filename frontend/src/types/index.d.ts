/// <reference types="vite/client" />

export type SupportedLang = 'fr' | 'en';

export interface Act {
  id: string;
  icon: string;
  indicator1: { label: string; value: string };
  indicator2: { label: string; value: string };
  callout: string;
}

export interface Stats {
  analyses: number;
  regions: number;
  zones: number;
}

export interface NavLink {
  to: string;
  labelKey: string;
}

// Leaflet module augmentation for default icon fix
declare module 'leaflet' {
  interface DefaultMapPanes {
    shadowPane: HTMLElement;
  }
}
