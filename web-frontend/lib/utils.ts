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
