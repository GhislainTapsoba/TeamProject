'use client';

import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        turnstile?: {
            render: (el: HTMLElement, options: Record<string, unknown>) => string;
            remove: (id: string) => void;
        };
    }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export const turnstileEnabled = Boolean(SITE_KEY);

// Case anti-robot Cloudflare ; n'apparaît que si la clé publique est configurée
export default function Turnstile({ onToken }: { onToken: (token: string) => void }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!SITE_KEY || !ref.current) return;
        let widgetId: string | undefined;
        const render = () => {
            if (!ref.current || !window.turnstile) return;
            widgetId = window.turnstile.render(ref.current, {
                sitekey: SITE_KEY,
                language: 'fr',
                theme: 'light',
                callback: onToken,
                'expired-callback': () => onToken(''),
                'error-callback': () => onToken(''),
            });
        };

        if (window.turnstile) {
            render();
        } else {
            let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
            if (!script) {
                script = document.createElement('script');
                script.src = SCRIPT_URL;
                script.async = true;
                document.head.appendChild(script);
            }
            script.addEventListener('load', render);
        }
        return () => {
            if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
        };
    }, [onToken]);

    if (!SITE_KEY) return null;
    return <div ref={ref} className="min-h-[65px]" />;
}
