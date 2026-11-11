/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--sf-font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
          slate: {
            50: 'rgb(var(--sf-text-max) / <alpha-value>)',
            100: 'rgb(var(--sf-text-high) / <alpha-value>)',
            200: 'rgb(var(--sf-text-bright) / <alpha-value>)',
            300: 'rgb(var(--sf-text-primary) / <alpha-value>)',
            400: 'rgb(var(--sf-text-secondary) / <alpha-value>)',
            500: 'rgb(var(--sf-text-subtle) / <alpha-value>)',
            600: 'rgb(var(--sf-text-muted) / <alpha-value>)',
            700: 'rgb(var(--sf-border-strong) / <alpha-value>)',
            800: 'rgb(var(--sf-bg-elevated) / <alpha-value>)',
            900: 'rgb(var(--sf-bg-panel) / <alpha-value>)',
            950: 'rgb(var(--sf-bg-app) / <alpha-value>)',
          },
          indigo: {
            50: 'rgb(var(--sf-accent-50) / <alpha-value>)',
            100: 'rgb(var(--sf-accent-100) / <alpha-value>)',
            200: 'rgb(var(--sf-accent-200) / <alpha-value>)',
            300: 'rgb(var(--sf-accent-300) / <alpha-value>)',
            400: 'rgb(var(--sf-accent-400) / <alpha-value>)',
            500: 'rgb(var(--sf-accent-500) / <alpha-value>)',
            600: 'rgb(var(--sf-accent-600) / <alpha-value>)',
            700: 'rgb(var(--sf-accent-700) / <alpha-value>)',
            800: 'rgb(var(--sf-accent-800) / <alpha-value>)',
            900: 'rgb(var(--sf-accent-900) / <alpha-value>)',
            950: 'rgb(var(--sf-accent-950) / <alpha-value>)',
          },
        },
      },
    },
    plugins: [],
  };
