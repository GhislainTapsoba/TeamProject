import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './contexts/**/*.{ts,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
                mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
            },
            // Couleurs du logo Deep Technologies : bleu outremer #0820d8 et orange #ff6800
            colors: {
                canvas: '#05071a',
                brand: {
                    50: '#eef0ff',
                    100: '#dfe3ff',
                    200: '#c3caff',
                    300: '#9aa6ff',
                    400: '#6b7bff',
                    500: '#3b4ff0',
                    600: '#0820d8',
                    700: '#0619b0',
                    800: '#08168c',
                    900: '#0b166f',
                    950: '#070d42',
                },
                flame: {
                    100: '#ffecdc',
                    200: '#ffd0a8',
                    300: '#ffac6e',
                    400: '#ff8a3a',
                    500: '#ff6800',
                    600: '#e05a00',
                    700: '#b84800',
                },
            },
            boxShadow: {
                glow: '0 0 0 1px rgba(8, 32, 216, 0.5), 0 8px 32px -8px rgba(8, 32, 216, 0.7)',
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
