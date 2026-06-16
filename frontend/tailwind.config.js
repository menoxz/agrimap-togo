/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B5E20',
          hover: '#2E7D32',
          light: '#E8F5E9',
        },
        secondary: {
          DEFAULT: '#1565C0',
          light: '#E3F2FD',
        },
        accent: {
          DEFAULT: '#E65100',
          light: '#FFF3E0',
        },
        bg: '#FAFAF5',
        surface: '#FFFFFF',
        'surface-alt': '#F5F5F0',
        text: '#1E293B',
        'text-secondary': '#334155',
        muted: '#64748B',
        border: '#E2E8F0',
        success: '#166534',
        warning: '#9A3412',
        error: '#991B1B',
        info: '#1E40AF',
        // Togo Heritage palette
        'togo-green': {
          DEFAULT: '#006A4E',
          light: '#E8F5E9',
          dark: '#004D3A',
        },
        'togo-yellow': {
          DEFAULT: '#FFD100',
          light: '#FFF8E1',
          dark: '#C7A700',
        },
        'togo-red': {
          DEFAULT: '#D21034',
          light: '#FFEBEE',
          dark: '#A00D29',
        },
        'togo-white': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1.4' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        body: ['1rem', { lineHeight: '1.6' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        label: ['0.875rem', { lineHeight: '1.3', fontWeight: '600' }],
        h4: ['1.125rem', { lineHeight: '1.3', fontWeight: '600' }],
        h3: ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        h2: ['1.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        h1: ['2rem', { lineHeight: '1.1', fontWeight: '700' }],
        hero: ['2.5rem', { lineHeight: '1.1', fontWeight: '800' }],
        'section-title': ['3.5rem', { lineHeight: '1.1', fontWeight: '900', letterSpacing: '-0.03em' }],
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '24px',
        6: '32px',
        7: '48px',
        8: '64px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
      borderWidth: {
        DEFAULT: '1px',
        focus: '2px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(30,41,59,0.08)',
        md: '0 4px 6px rgba(30,41,59,0.07)',
        lg: '0 10px 15px rgba(30,41,59,0.1)',
      },
      screens: {
        mobile: { max: '639px' },
        tablet: { min: '640px', max: '1023px' },
        desktop: { min: '1024px' },
      },
      keyframes: {
        // Indicateur scroll hero — descend et disparaît
        'scroll-line': {
          '0%':   { transform: 'scaleY(0)',                   opacity: '0.8', transformOrigin: 'top center' },
          '50%':  { transform: 'scaleY(1)',                   opacity: '1',   transformOrigin: 'top center' },
          '100%': { transform: 'scaleY(1) translateY(200%)', opacity: '0',   transformOrigin: 'top center' },
        },
        // Flottement doux (stat card hero)
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        // Pulse vert (point clignotant sur carte)
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)',   opacity: '1' },
          '50%':      { transform: 'scale(1.4)', opacity: '0.7' },
        },
      },
      animation: {
        'scroll-line': 'scroll-line 2.2s ease-in-out infinite',
        float:         'float 3.5s ease-in-out infinite',
        'pulse-dot':   'pulse-dot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
