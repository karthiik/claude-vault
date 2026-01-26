/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kj: {
          primary: '#6366f1',    // Indigo
          secondary: '#8b5cf6',  // Purple
          accent: '#f59e0b',     // Amber
          success: '#10b981',    // Emerald
          warning: '#f97316',    // Orange
          danger: '#ef4444',     // Red
          surface: '#1e1e2e',    // Dark surface
          text: '#cdd6f4'        // Light text
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
