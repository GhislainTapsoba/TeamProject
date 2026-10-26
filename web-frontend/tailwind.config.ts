import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './contexts/**/*.{ts,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
                mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
            },
            // Couleurs de Deep Technologies : le bleu et l'orange du logo, fond du site
            colors: {
                canvas: '#03080f',
                brand: {
                    50: '#eef6ff',
                    100: '#d9ebff',
                    200: '#bcdcff',
                    300: '#8ec6ff',
                    400: '#59a5ff',
                    500: '#2f86f5',
                    600: '#006edb',
                    700: '#0058b3',
                    800: '#064a92',
                    900: '#0b3f78',
                    950: '#08274b',
                },
                flame: {
                    100: '#ffe8d5',
                    200: '#ffcda6',
                    300: '#ffab6b',
                    400: '#ff8a3d',
                    500: '#f66500',
                    600: '#d95700',
                    700: '#b34600',
                },
            },
            boxShadow: {
                glow: '0 0 0 1px rgba(0, 110, 219, 0.4), 0 8px 32px -8px rgba(0, 110, 219, 0.55)',
                card: '0 1px 0 0 rgba(255, 255, 255, 0.04) inset, 0 12px 32px -16px rgba(0, 0, 0, 0.7)',
            },
            keyframes: {
                shimmer: {
                    from: { backgroundPosition: '200% 0' },
                    to: { backgroundPosition: '-200% 0' },
                },
            },
            animation: {
                shimmer: 'shimmer 2.2s linear infinite',
            },
        },
    },
    plugins: [],
};

export default config;
