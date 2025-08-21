// 📁 /src/styles/theme.ts

export const theme = {
  colors: {
    background: '#121212', // Near-black for dark mode
    card: '#1E1E1E',        // Soft contrast cards/widgets
    accent: '#FF3B30',      // Red accent for scan triggers, highlights
    success: '#32CD32',     // Green for bullish signals, confirmations
    warning: '#FFD700',     // Yellow for alerts or caution
    border: '#2A2A2A',      // Muted divider lines

    text: {
      primary: '#FFFFFF',
      muted: '#B0B0B0',
      contrast: '#000000', // Optional for inverse text (e.g., green badge text)
    },

    tags: {
      bullish: '#32CD32',
      bearish: '#FF3B30',
      neutral: '#666666',
    },
  },

  fontSizes: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    md: '1.125rem',    // 18px
    lg: '1.25rem',     // 20px
    xl: '1.5rem',      // 24px
    '2xl': '1.875rem', // 30px
    '3xl': '2.25rem',  // 36px
  },

  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '2rem',      // 32px
    xl: '4rem',      // 64px
  },

  radii: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '2rem',
    pill: '9999px',
  },

  borders: {
    thin: '1px solid #2A2A2A',
    accent: '1px solid #FF3B30',
    success: '1px solid #32CD32',
  },

  transitions: {
    default: 'all 0.3s ease',
    fast: 'all 0.2s ease-in-out',
  },

  shadows: {
    card: '0 4px 10px rgba(0,0,0,0.2)',
    hover: '0 6px 12px rgba(0,0,0,0.3)',
  },

  zIndex: {
    base: 1,
    overlay: 10,
    modal: 100,
    tooltip: 1000,
  },
};
