/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito Sans"', 'sans-serif']
      },
      colors: {
        primary: {
          50: '#f7fce8',
          100: '#edf8c8',
          200: '#ddf293',
          300: '#c7e75e',
          400: '#afd635',
          500: '#8eb428',
          600: '#7a9922',
          700: '#6d9120',
          800: '#5a771a',
          900: '#4a6116'
        },
        success: {
          light: '#66ffaa',
          DEFAULT: '#00ff88',
          hover: '#33ff99',
          dark: '#00cc6d'
        },
        error: {
          light: '#ff8888',
          DEFAULT: '#ff4444',
          hover: '#ff6666',
          dark: '#cc0000'
        },
        warning: {
          light: '#ffc04d',
          DEFAULT: '#ffa500',
          hover: '#ffb732',
          dark: '#cc8400'
        },
        info: {
          light: '#66d4ff',
          DEFAULT: '#00b4ff',
          hover: '#33c5ff',
          dark: '#0090cc'
        },
        neutral: {
          dark: '#000000',
          'dark-secondary': '#1a1a2e',
          'dark-tertiary': '#16213e',
          'dark-quaternary': '#0f3460'
        }
      },
      backgroundColor: {
        glass: {
          dark: 'rgba(18, 18, 18, 0.55)',
          'dark-strong': 'rgba(18, 18, 18, 0.75)',
          'dark-weak': 'rgba(18, 18, 18, 0.35)',
          'dark-hover': 'rgba(18, 18, 18, 0.65)',
          light: 'rgba(255, 255, 255, 0.1)',
          'light-hover': 'rgba(255, 255, 255, 0.15)',
          'light-strong': 'rgba(255, 255, 255, 0.2)',
          'light-weak': 'rgba(255, 255, 255, 0.05)'
        }
      },
      borderColor: {
        light: 'rgba(255, 255, 255, 0.1)',
        'light-hover': 'rgba(255, 255, 255, 0.2)',
        'light-strong': 'rgba(255, 255, 255, 0.3)'
      },
      boxShadow: {
        'glow-success': '0 0 20px rgba(142, 180, 40, 0.3)',
        'glow-error': '0 0 20px rgba(255, 68, 68, 0.3)',
        'glow-warning': '0 0 20px rgba(255, 165, 0, 0.3)',
        'glow-info': '0 0 20px rgba(0, 180, 255, 0.3)',
        'glow-dev': '0 0 16px rgba(255, 152, 0, 0.5)'
      },
      blur: {
        xs: '5px',
        sm: '10px',
        md: '20px',
        lg: '30px'
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        standard: 'var(--radius-standard)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)'
      }
    }
  },
  plugins: []
};

