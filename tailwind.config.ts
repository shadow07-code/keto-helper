import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:        '#FAF6EF',
        'cream-mid':  '#F2EAD8',
        'cream-dark': '#E8DCC8',
        'green-deep': '#253D31',
        'green-rich': '#2D4A3E',
        'green-mid':  '#4A7C59',
        'green-light':'#A8C5A0',
        gold:         '#C9A84C',
        'gold-bright':'#E6C24A',
        'gold-pale':  '#F5EDD0',
        brown:        '#7B5E3A',
        carbs:        '#D4714A',
        protein:      '#4A7C59',
        fat:          '#C9A84C',
        ink:          '#14201A',
        'ink-raised': '#1E2E26',
        'ink-line':   '#2C4036',
        'text-hi':    '#F3EEE2',
        'text-lo':    '#8FA396',
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        lato:     ['var(--font-lato)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
