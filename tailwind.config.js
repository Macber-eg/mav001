/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core colors
        primary: '#00FFB2', // Bright cyan/mint for primary actions
        secondary: '#1A1A40', // Deep blue-purple for depth
        neutral: '#0A0A0A', // Near black for background
        
        // Neon accents
        'neon-green': '#00FFB2', // Bright cyan/mint
        'neon-purple': '#B200FF', // Bright purple for accents
        'neon-blue': '#00B2FF', // Bright blue for accents
        
        // Surface colors
        'dark-surface': '#121212', // Slightly lighter than neutral for cards
        'dark-border': '#2A2A2A', // Subtle borders
        
        // Status colors with better contrast
        'success': '#00FF94', // Bright green
        'warning': '#FFB800', // Bright yellow
        'error': '#FF3D3D', // Bright red
        'info': '#00B2FF', // Bright blue
        
        // Text colors
        'text-primary': '#FFFFFF',
        'text-secondary': '#B3B3B3',
        'text-disabled': '#666666',
        
        black: '#000000'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon': '0 0 10px rgba(0, 255, 178, 0.3)', // Subtle neon glow
        'neon-strong': '0 0 20px rgba(0, 255, 178, 0.5)', // Stronger neon glow
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-dark': 'linear-gradient(to bottom right, #0A0A0A, #1A1A40)',
      },
    },
  },
  plugins: [],
};