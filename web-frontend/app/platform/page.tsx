'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { platformAPI, PlatformError } from '@/lib/platform';
import {
    ShieldCheck,
    LogOut,
    Building2,
    CreditCard,
    ScrollText,
    Loader2,
    AlertCircle,
    Users,
    FolderKanban,
    Ban,
    CheckCircle2,
    CalendarPlus,
    X,
} from 'lucide-react';

const STATUS: Record<string, { label: string; className: string }> = {
    active: { label: 'Actif', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    trial: { label: 'Essai', className: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    past_due: { label: 'En retard', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    cancelled: { label: 'Suspendu', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
};
const PAYMENT: Record<string, string> = { paid: 'text-emerald-400', pending: 'text-amber-400', failed: 'text-red-400' };

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('fr-FR') : '-');
const fmtMoney = (v: number | string) => Number(v).toLocaleString('fr-FR');

type Tab = 'tenants' | 'payments' | 'audit';

export default function PlatformConsole() {
    const [phase, setPhase] = useState<'checking' | 'login' | 'ready'>('checking');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [tab, setTab] = useState<Tab>('tenants');
    const [data, setData] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [audit, setAudit] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [banner, setBanner] = useState('');

    const load = useCallback(async () => {
        const overview = await platformAPI.overview();
        setData(overview);
        setPhase('ready');
    }, []);

    // On mount, try to use an existing session; a 403 means "signed in but not a platform admin"
    useEffect(() => {
        (async () => {
            try {
                await load();
            } catch (e) {
                if (e instanceof PlatformError && e.status === 403) {
                    await supabase.auth.signOut();
                    setLoginError('Ce compte n\'a pas accès à la console plateforme.');
                }
                setPhase('login');
            }
        })();
    }, [load]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setSubmitting(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw new Error('Identifiants invalides.');
            await load();
        } catch (err: any) {
            if (err instanceof PlatformError && err.status === 403) {
                await supabase.auth.signOut();
                setLoginError('Ce compte n\'a pas accès à la console plateforme.');
            } else {
                setLoginError(err.message || 'Connexion impossible.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setData(null);
        setPhase('login');
    };

    const loadTab = useCallback(async (next: Tab) => {
        setTab(next);
        try {
            if (next === 'payments') setPayments(await platformAPI.payments());
            if (next === 'audit') setAudit(await platformAPI.audit());
        } catch {
            /* handled by banner elsewhere */
        }
    }, []);

    const openTenant = useCallback(async (schema: string) => {
        try {
            setSelected(await platformAPI.tenant(schema));
        } catch {
            setBanner('Impossible de charger cette organisation.');
        }
    }, []);

    const refresh = useCallback(async () => {
        setData(await platformAPI.overview());
        if (selected) setSelected(await platformAPI.tenant(selected.schema_name));
    }, [selected]);

    if (phase === 'checking') {
        return (
            <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (phase === 'login') {
        return (
            <div className="min-h-screen grid place-items-center bg-slate-950 px-4">
                <form onSubmit={handleLogin} className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
                    <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center">
                            <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-white">Console plateforme</h1>
                            <p className="text-[11px] text-slate-400">Accès réservé à l&apos;administration</p>
                        </div>
                    </div>
                    {loginError && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                            <AlertCircle className="h-4 w-4 shrink-0" /> <span>{loginError}</span>
                        </div>
                    )}
                    <div className="space-y-3">
                        <input
                            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email super-admin"
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                        />
                        <input
                            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mot de passe"
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <button
                        type="submit" disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Se connecter
                    </button>
                </form>
            </div>
        );
    }

    const stats = data?.stats;
    const tenants = data?.tenants || [];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-3">
                <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    <span className="font-bold text-white">Console plateforme</span>
                </div>
                <button onClick={logout} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-red-400">
                    <LogOut className="h-4 w-4" /> Déconnexion
                </button>
            </header>

            <main className="mx-auto max-w-6xl space-y-6 p-6">
                {stats && (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {[
                            { label: 'Organisations', value: stats.tenants },
                            { label: 'Actives', value: stats.active_subscriptions },
                            { label: 'Essais', value: stats.trials },
                            { label: 'En retard', value: stats.past_due },
                            { label: 'Suspendues', value: stats.suspended },
                            { label: 'MRR (XOF)', value: fmtMoney(stats.mrr_xof) },
                        ].map((s) => (
                            <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                                <p className="text-[11px] uppercase tracking-wider text-slate-500">{s.label}</p>
                                <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-1 border-b border-slate-800">
                    {([['tenants', 'Organisations', Building2], ['payments', 'Paiements', CreditCard], ['audit', 'Journal d\'audit', ScrollText]] as const).map(
                        ([key, label, Icon]) => (
                            <button
                                key={key} onClick={() => loadTab(key)}
                                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium ${
                                    tab === key ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" /> {label}
                            </button>
                        )
                    )}
                </div>

                {tab === 'tenants' && (
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-900/80 text-slate-400">
                                <tr>
                                    <th className="px-4 py-2.5 text-left font-medium">Organisation</th>
                                    <th className="px-4 py-2.5 text-left font-medium">Plan</th>
                                    <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                                    <th className="px-4 py-2.5 text-left font-medium">Fin de période</th>
                                    <th className="px-4 py-2.5 text-left font-medium">Usage</th>
                                    <th className="px-4 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80">
                                {tenants.map((t: any) => {
                                    const st = STATUS[t.subscription?.status] || STATUS.active;
                                    return (
                                        <tr key={t.schema_name} className="text-slate-300 hover:bg-slate-900/40">
                                            <td className="px-4 py-2.5">
                                                <div className="font-medium text-white">{t.name}</div>
                                                <div className="text-[11px] text-slate-500">{t.primary_domain}</div>
                                            </td>
                                            <td className="px-4 py-2.5">{t.subscription?.plan_name || '-'}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`rounded-full border px-2 py-0.5 font-semibold ${st.className}`}>{st.label}</span>
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(t.subscription?.current_period_end)}</td>
                                            <td className="px-4 py-2.5">
                                                <span className="inline-flex items-center gap-1 text-slate-400"><Users className="h-3 w-3" />{t.usage.users_count}/{t.usage.max_users ?? '-'}</span>
                                                <span className="ml-2 inline-flex items-center gap-1 text-slate-400"><FolderKanban className="h-3 w-3" />{t.usage.projects_count}/{t.usage.max_projects ?? '-'}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <button onClick={() => openTenant(t.schema_name)} className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium hover:bg-slate-700">Gérer</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'payments' && (
                    <PaymentsTable payments={payments} />
                )}

                {tab === 'audit' && (
                    <AuditTable logs={audit} />
                )}
            </main>

            {selected && (
                <TenantDrawer
                    tenant={selected}
                    onClose={() => setSelected(null)}
                    onChanged={refresh}
                    setBanner={setBanner}
                />
            )}
            {banner && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-slate-200 shadow-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {banner}
                    <button onClick={() => setBanner('')}><X className="h-3.5 w-3.5 text-slate-500" /></button>
                </div>
            )}
        </div>
    );
}

function PaymentsTable({ payments }: { payments: any[] }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs">
                <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                        <th className="px-4 py-2.5 text-left font-medium">Date</th>
                        <th className="px-4 py-2.5 text-left font-medium">Organisation</th>
                        <th className="px-4 py-2.5 text-left font-medium">Plan</th>
                        <th className="px-4 py-2.5 text-right font-medium">Montant</th>
                        <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                        <th className="px-4 py-2.5 text-left font-medium">Référence</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                    {payments.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucun paiement.</td></tr>
                    ) : payments.map((p) => (
                        <tr key={p.transaction_id} className="text-slate-300">
                            <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                            <td className="px-4 py-2.5">{p.tenant_name}</td>
                            <td className="px-4 py-2.5">{p.plan_name}</td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtMoney(p.amount)} {p.currency}</td>
                            <td className={`px-4 py-2.5 font-semibold ${PAYMENT[p.status] || ''}`}>{p.status}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{p.transaction_id}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AuditTable({ logs }: { logs: any[] }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs">
                <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                        <th className="px-4 py-2.5 text-left font-medium">Date</th>
                        <th className="px-4 py-2.5 text-left font-medium">Administrateur</th>
                        <th className="px-4 py-2.5 text-left font-medium">Action</th>
                        <th className="px-4 py-2.5 text-left font-medium">Cible</th>
                        <th className="px-4 py-2.5 text-left font-medium">IP</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                    {logs.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucune action enregistrée.</td></tr>
                    ) : logs.map((l) => (
                        <tr key={l.id} className="text-slate-300">
                            <td className="px-4 py-2.5 whitespace-nowrap">{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                            <td className="px-4 py-2.5">{l.actor_email}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-indigo-300">{l.action}</td>
                            <td className="px-4 py-2.5">{l.target}</td>
                            <td className="px-4 py-2.5 text-slate-500">{l.ip_address || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TenantDrawer({ tenant, onClose, onChanged, setBanner }: {
    tenant: any; onClose: () => void; onChanged: () => Promise<void>; setBanner: (s: string) => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [days, setDays] = useState(30);
    const suspended = tenant.subscription?.status === 'cancelled';

    const act = async (fn: () => Promise<any>, message: string) => {
        setBusy(true);
        setError('');
        try {
            await fn();
            await onChanged();
            setBanner(message);
        } catch (e: any) {
            setError(e.message || 'Action impossible.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
            <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-950 p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">{tenant.name}</h2>
                        <p className="text-xs text-slate-500">{tenant.primary_domain}</p>
                    </div>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-500 hover:text-white" /></button>
                </div>

                {error && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                        <AlertCircle className="h-4 w-4 shrink-0" /> <span>{error}</span>
                    </div>
                )}

                <div className="mt-5 space-y-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs">
                        <p className="text-slate-400">Plan <span className="font-semibold text-white">{tenant.subscription?.plan_name}</span>, statut <span className="font-semibold text-white">{tenant.subscription?.status}</span></p>
                        <p className="mt-1 text-slate-400">Fin de période : {fmtDate(tenant.subscription?.current_period_end)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))}
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                            disabled={busy}
                            onClick={() => act(() => platformAPI.extend(tenant.schema_name, days), `Période prolongée de ${days} jours.`)}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                        >
                            <CalendarPlus className="h-4 w-4" /> Prolonger
                        </button>
                    </div>

                    {suspended ? (
                        <button
                            disabled={busy}
                            onClick={() => act(() => platformAPI.suspend(tenant.schema_name, false), 'Organisation réactivée.')}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                        >
                            <CheckCircle2 className="h-4 w-4" /> Réactiver l&apos;organisation
                        </button>
                    ) : (
                        <button
                            disabled={busy}
                            onClick={() => act(() => platformAPI.suspend(tenant.schema_name, true), 'Organisation suspendue.')}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600/90 py-2.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                        >
                            <Ban className="h-4 w-4" /> Suspendre (lecture seule)
                        </button>
                    )}

                    {tenant.members && (
                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Membres</p>
                            <ul className="space-y-1.5 text-xs">
                                {tenant.members.map((m: any) => (
                                    <li key={m.email} className="flex justify-between">
                                        <span className="text-slate-300">{m.full_name}</span>
                                        <span className="text-slate-500">{m.role}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
