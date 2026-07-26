/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enables toggling dark mode via a class (e.g., <html class="dark">)
  darkMode: 'class', 
  theme: {
    extend: {
      colors: {
        // Semantic Token Mappings
        surface: 'var(--surface)',
        'surface-dim': 'var(--surface-dim)',
        'surface-bright': 'var(--surface-bright)',
        'surface-container-lowest': 'var(--surface-container-lowest)',
        'surface-container-low': 'var(--surface-container-low)',
        'surface-container': 'var(--surface-container)',
        'surface-container-high': 'var(--surface-container-high)',
        'surface-container-highest': 'var(--surface-container-highest)',
        'on-surface': 'var(--on-surface)',
        'on-surface-variant': 'var(--on-surface-variant)',
        'inverse-surface': 'var(--inverse-surface)',
        'inverse-on-surface': 'var(--inverse-on-surface)',
        outline: 'var(--outline)',
        'outline-variant': 'var(--outline-variant)',
        'surface-tint': 'var(--surface-tint)',
        
        primary: 'var(--primary)',
        'on-primary': 'var(--on-primary)',
        'primary-container': 'var(--primary-container)',
        'on-primary-container': 'var(--on-primary-container)',
        'inverse-primary': 'var(--inverse-primary)',
        
        secondary: 'var(--secondary)',
        'on-secondary': 'var(--on-secondary)',
        'secondary-container': 'var(--secondary-container)',
        'on-secondary-container': 'var(--on-secondary-container)',
        
        tertiary: 'var(--tertiary)',
        'on-tertiary': 'var(--on-tertiary)',
        'tertiary-container': 'var(--tertiary-container)',
        'on-tertiary-container': 'var(--on-tertiary-container)',
        
        error: 'var(--error)',
        'on-error': 'var(--on-error)',
        'error-container': 'var(--error-container)',
        'on-error-container': 'var(--on-error-container)',

        // Brand Palette Naming Defaults
        background: 'var(--background)',
        'on-background': 'var(--on-background)',
        'surface-variant': 'var(--surface-variant)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      letterSpacing: {
        'tight-xl': '-0.04em',
        'tight-lg': '-0.02em',
        'tight-md': '-0.01em',
        'spec': '0.05em',
      },
      spacing: {
        'container-max': '1440px',
        'gutter': '24px',
        'margin-desktop': '64px',
        'margin-mobile': '20px',
        'section-gap': '120px',
        'stack-sm': '8px',
        'stack-md': '16px',
        'stack-lg': '32px',
      },
      borderRadius: {
        'DEFAULT': '0.5rem', // 8px Rounded-Eight base
        'sm': '0.25rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
