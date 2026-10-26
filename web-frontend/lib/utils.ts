export function cn(...classes: (string | false | null | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

export function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
    return value ? new Date(value).toLocaleDateString('fr-FR', options) : '—';
}

export function initials(name?: string) {
    const parts = (name || '?').trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

// Échéance en langage courant : « Pour demain », « En retard (prévue le 3 novembre) »
export function dueLabel(value: string | null | undefined, done: boolean): { text: string; late: boolean } | null {
    if (!value) return null;
    const day = new Date(value + 'T00:00:00');
    const today = new Date(new Date().toDateString());
    const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
    const date = day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    if (done) return { text: `Prévue le ${date}`, late: false };
    if (diff < 0) return { text: `En retard (prévue le ${date})`, late: true };
    if (diff === 0) return { text: "Pour aujourd'hui", late: false };
    if (diff === 1) return { text: 'Pour demain', late: false };
    return { text: `Pour le ${date}`, late: false };
}

// Les listes de l'API sont paginées ou non selon l'endpoint
export function listOf<T = any>(res: { data: any }): T[] {
    return res.data?.results ?? res.data ?? [];
}

// Premier message d'erreur lisible renvoyé par Django REST Framework
export function errorMessage(err: any, fallback: string) {
    const data = err?.response?.data;
    if (!data || typeof data !== 'object') return fallback;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.error === 'string') return data.error;
    const firstField = Object.values(data).find((v) => Array.isArray(v)) as string[] | undefined;
    return firstField?.[0] || fallback;
}
