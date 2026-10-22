import { supabase } from '@/lib/supabase';

// Dedicated client for the platform console. It is intentionally separate from
// lib/api.ts so a 401/403 here never triggers the dashboard's sign-out/redirect.
const BASE = '/api/platform';

export class PlatformError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

async function request(path: string, options: RequestInit = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
        throw new PlatformError(401, 'Session expirée.');
    }
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });
    if (res.status === 204) return null;
    let body: any = null;
    try {
        body = await res.json();
    } catch {
        body = null;
    }
    if (!res.ok) {
        const message = body?.detail || body?.error || `Erreur ${res.status}`;
        throw new PlatformError(res.status, message);
    }
    return body;
}

export const platformAPI = {
    overview: () => request('/overview/'),
    tenant: (schema: string) => request(`/tenants/${encodeURIComponent(schema)}/`),
    suspend: (schema: string, suspend: boolean) =>
        request(`/tenants/${encodeURIComponent(schema)}/suspend/`, {
            method: 'POST',
            body: JSON.stringify({ suspend }),
        }),
    extend: (schema: string, days: number, plan?: string) =>
        request(`/tenants/${encodeURIComponent(schema)}/extend/`, {
            method: 'POST',
            body: JSON.stringify({ days, ...(plan ? { plan } : {}) }),
        }),
    resetPassword: (schema: string, email: string, newPassword: string) =>
        request(`/tenants/${encodeURIComponent(schema)}/reset-password/`, {
            method: 'POST',
            body: JSON.stringify({ email, new_password: newPassword }),
        }),
    payments: (status?: string) => request(`/payments/${status ? `?status=${status}` : ''}`),
    audit: () => request('/audit/'),
};
