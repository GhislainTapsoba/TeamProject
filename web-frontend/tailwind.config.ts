import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './contexts/**/*.{ts,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
                mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
            },
            colors: {
                canvas: '#07070a',
                accent: {
                    DEFAULT: '#8b5cf6',
                    soft: '#a78bfa',
                },
            },
            boxShadow: {
                glow: '0 0 0 1px rgba(139, 92, 246, 0.35), 0 8px 32px -8px rgba(139, 92, 246, 0.45)',
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
