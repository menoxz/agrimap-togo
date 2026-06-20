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
        // ── Page & element entrance ──────────────────────────────────────
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(52px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'hero-word': {
          '0%':   { opacity: '0', transform: 'translateY(72px) scale(0.92)', filter: 'blur(12px)' },
          '65%':  { opacity: '1', transform: 'translateY(-6px) scale(1.02)', filter: 'blur(0)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
        'hero-orbit': {
          '0%':   { opacity: '0', transform: 'scale(0.55) rotate(-35deg)' },
          '70%':  { opacity: '1', transform: 'scale(1.1) rotate(8deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        'hero-glow': {
          '0%, 100%': { opacity: '0.55', transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%':      { opacity: '0.95', transform: 'translate3d(0, -18px, 0) scale(1.12)' },
        },
        'cta-pop': {
          '0%':   { opacity: '0', transform: 'translateY(32px) scale(0.86)' },
          '62%':  { opacity: '1', transform: 'translateY(-7px) scale(1.06)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'stat-pop': {
          '0%':   { opacity: '0', transform: 'translateY(46px) rotateX(28deg) scale(0.84)' },
          '65%':  { opacity: '1', transform: 'translateY(-8px) rotateX(0deg) scale(1.06)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotateX(0deg) scale(1)' },
        },
        'ring-pop': {
          '0%':   { opacity: '0', transform: 'scale(0.45) rotate(-18deg)' },
          '72%':  { opacity: '1', transform: 'scale(1.12) rotate(4deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0)' },
        },
        'draw-ring': {
          '0%':   { strokeDashoffset: '226' },
          '100%': { strokeDashoffset: '0' },
        },
        'map-reveal': {
          '0%':   { opacity: '0', transform: 'translateX(76px) scale(0.9)', clipPath: 'inset(0 0 0 78% round 24px)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)', clipPath: 'inset(0 0 0 0 round 24px)' },
        },
        'page-sweep': {
          '0%':   { opacity: '0', transform: 'translateY(34px) scale(0.985)', filter: 'blur(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-down': {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // ── Skeleton shimmer ─────────────────────────────────────────────
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'scroll-line': 'scroll-line 2.2s ease-in-out infinite',
        float:         'float 3.5s ease-in-out infinite',
        'pulse-dot':   'pulse-dot 1.8s ease-in-out infinite',
        // Entrance animations
        'fade-up':    'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in':    'fade-in 0.4s ease-out both',
        'slide-down': 'slide-down 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in':   'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'hero-word':  'hero-word 0.95s cubic-bezier(0.16, 1, 0.3, 1) both',
        'hero-orbit': 'hero-orbit 1.05s cubic-bezier(0.16, 1, 0.3, 1) both',
        'hero-glow':  'hero-glow 5s ease-in-out infinite',
        'cta-pop':    'cta-pop 0.75s cubic-bezier(0.16, 1, 0.3, 1) both',
        'stat-pop':   'stat-pop 0.85s cubic-bezier(0.16, 1, 0.3, 1) both',
        'ring-pop':   'ring-pop 0.75s cubic-bezier(0.16, 1, 0.3, 1) both',
        'draw-ring':  'draw-ring 1.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        'map-reveal': 'map-reveal 0.95s cubic-bezier(0.16, 1, 0.3, 1) both',
        'page-sweep': 'page-sweep 0.72s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer:      'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
