/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0E7490',
          'primary-hover': '#155E75',
          accent: '#06B6D4',
          surface: '#0F172A',
          'surface-2': '#1E293B',
          'surface-light': '#F5F2EE',
          border: '#1E293B',
          'text-primary': '#F8FAFC',
          'text-secondary': '#94A3B8',
          'text-muted': '#64748B',
        },
        status: {
          success: '#10B981',
          'success-bg': 'rgba(16,185,129,0.08)',
          'success-border': 'rgba(16,185,129,0.30)',
          warn: '#F59E0B',
          'warn-bg': 'rgba(245,158,11,0.08)',
          'warn-border': 'rgba(245,158,11,0.30)',
          danger: '#EF4444',
          'danger-bg': 'rgba(239,68,68,0.08)',
          'danger-border': 'rgba(239,68,68,0.30)',
          info: '#06B6D4',
          'info-bg': 'rgba(6,182,212,0.08)',
          'info-border': 'rgba(6,182,212,0.30)',
          neutral: '#64748B',
          'neutral-bg': 'rgba(100,116,139,0.08)',
          'neutral-border': 'rgba(100,116,139,0.30)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(2,6,23,0.06), 0 8px 24px -12px rgba(2,6,23,0.30)',
        popover: '0 4px 6px -1px rgba(2,6,23,0.10), 0 2px 4px -2px rgba(2,6,23,0.10)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};

