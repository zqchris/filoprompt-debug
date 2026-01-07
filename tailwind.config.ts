import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Filo 深色主题配色
        filo: {
          bg: '#0a0e14',
          surface: '#0f1419',
          border: '#1e2530',
          'border-light': '#2a3545',
          text: '#e6e6e6',
          'text-muted': '#8b949e',
          accent: '#3b82f6',
          'accent-hover': '#2563eb',
          warning: '#f59e0b',
          error: '#ef4444',
          success: '#22c55e',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
