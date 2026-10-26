import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './contexts/**/*.{ts,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
                mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
            },
            // Thème clair aux couleurs du logo Deep Technologies : bleu outremer #0820d8 et orange #ff6800
            colors: {
                canvas: '#f5f7fd',
                // Textes : bleu nuit tiré du logo, en trois niveaux d'importance
                ink: {
                    DEFAULT: '#0b1033',
                    muted: '#3d4466',
                    soft: '#5f6688',
                },
                line: '#e2e6f3',
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
                    50: '#fff5ec',
                    100: '#ffecdc',
                    200: '#ffd0a8',
                    300: '#ffac6e',
                    400: '#ff8a3a',
                    500: '#ff6800',
                    600: '#e05a00',
                    700: '#b84800',
                    800: '#933a00',
                },
            },
            boxShadow: {
                glow: '0 0 0 1px rgba(8, 32, 216, 0.25), 0 12px 32px -12px rgba(8, 32, 216, 0.45)',
                card: '0 1px 2px rgba(11, 16, 51, 0.04), 0 8px 24px -12px rgba(11, 16, 51, 0.12)',
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
