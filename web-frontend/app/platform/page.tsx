'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Ban, Building2, CalendarPlus, CheckCircle2, CreditCard, FolderKanban, Loader2, Lock, LogOut, Mail, ShieldCheck, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { platformAPI, PlatformError } from '@/lib/platform';
import { PAYMENT_STATUSES, ROLES, SUBSCRIPTION_STATUSES } from '@/lib/labels';
import { formatDate } from '@/lib/utils';
import { fadeUp, spring } from '@/lib/motion';
import Logo from '@/components/Logo';
import AuthShell from '@/components/AuthShell';
import { AnimatedNumber, Avatar, Badge, Card, Notice, Page, Segmented } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/field';
import { Choice } from '@/components/ui/choice';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';

const fmtMoney = (v: number | string) => Number(v).toLocaleString('fr-FR');

type Tab = 'tenants' | 'payments' | 'audit';

// Console du propriétaire du SaaS : toutes les organisations, leurs abonnements et le journal d'audit
export default function PlatformConsole() {
    const toast = useToast();
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

    const load = useCallback(async () => {
        setData(await platformAPI.overview());
        setPhase('ready');
    }, []);

    // Au chargement, on réutilise une session existante ; un 403 signifie « connecté mais pas super-admin »
    useEffect(() => {
        (async () => {
            try {
                await load();
            } catch (e) {
                if (e instanceof PlatformError && e.status === 403) {
                    await supabase.auth.signOut();
                    setLoginError("Ce compte n'a pas accès à la console plateforme.");
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
            if (error) throw new Error('Email ou mot de passe incorrect.');
            await load();
        } catch (err: any) {
            if (err instanceof PlatformError && err.status === 403) {
                await supabase.auth.signOut();
                setLoginError("Ce compte n'a pas accès à la console plateforme.");
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

    const loadTab = useCallback(
        async (next: Tab) => {
            setTab(next);
            try {
                if (next === 'payments') setPayments(await platformAPI.payments());
                if (next === 'audit') setAudit(await platformAPI.audit());
            } catch {
                toast.error("Ces données n'ont pas pu se charger.");
            }
        },
        [toast]
    );

    const openTenant = useCallback(
        async (schema: string) => {
            try {
                setSelected(await platformAPI.tenant(schema));
            } catch {
                toast.error("Cette organisation n'a pas pu se charger.");
            }
        },
        [toast]
    );

    const refresh = useCallback(async () => {
        setData(await platformAPI.overview());
        if (selected) setSelected(await platformAPI.tenant(selected.schema_name));
    }, [selected]);

    if (phase === 'checking') {
        return (
            <div className="grid min-h-screen place-items-center">
                <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
            </div>
        );
    }

    if (phase === 'login') {
        return (
            <AuthShell title="Console plateforme" subtitle="Accès réservé à l’administration de Team Project.">
                <form onSubmit={handleLogin} className="space-y-4">
                    {loginError && <Notice tone="error">{loginError}</Notice>}
                    <Input label="Email super-admin" icon={Mail} type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
                    <PasswordInput label="Mot de passe" icon={Lock} required value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button type="submit" size="lg" icon={ShieldCheck} loading={submitting} className="w-full">
                        Se connecter
                    </Button>
                </form>
            </AuthShell>
        );
    }

    const stats = data?.stats;
    const tenants = data?.tenants || [];

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-30 border-b border-line bg-white/80 backdrop-blur-xl">
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-brand-600 via-brand-500 to-flame-500" />
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
                    <div className="flex items-center gap-3">
                        <Logo />
                        <Badge tone="flame" className="hidden sm:inline-flex">
                            <ShieldCheck className="h-3.5 w-3.5" /> Console plateforme
                        </Badge>
                    </div>
                    <Button variant="ghost" icon={LogOut} onClick={logout}>
                        Se déconnecter
                    </Button>
                </div>
            </header>

            <main className="px-4 py-8 sm:px-8">
                <Page>
                    <motion.div variants={fadeUp}>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            <span className="text-gradient">Vue d’ensemble</span>
                        </h1>
                        <p className="mt-2 text-base text-ink-muted">Toutes les organisations clientes et leurs abonnements.</p>
                    </motion.div>

                    {stats && (
                        <motion.div variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {[
                                { label: 'Organisations', value: stats.tenants },
                                { label: 'Abonnements actifs', value: stats.active_subscriptions },
                                { label: 'En essai', value: stats.trials },
                                { label: 'En retard', value: stats.past_due, alert: stats.past_due > 0 },
                                { label: 'Suspendues', value: stats.suspended, alert: stats.suspended > 0 },
                                { label: 'Revenu mensuel (XOF)', value: Number(stats.mrr_xof), money: true },
                            ].map((s) => (
                                <Card key={s.label} className="p-4">
                                    <p className={s.alert ? 'text-2xl font-semibold text-flame-600' : 'text-2xl font-semibold text-ink'}>
                                        {s.money ? fmtMoney(s.value) : <AnimatedNumber value={s.value || 0} />}
                                    </p>
                                    <p className="mt-1 text-sm text-ink-muted">{s.label}</p>
                                </Card>
                            ))}
                        </motion.div>
                    )}

                    <motion.div variants={fadeUp}>
                        <Segmented
                            id="platform-tabs"
                            value={tab}
                            onChange={loadTab}
                            options={[
                                { id: 'tenants', label: 'Organisations', count: tenants.length },
                                { id: 'payments', label: 'Paiements' },
                                { id: 'audit', label: 'Journal d’audit' },
                            ]}
                        />
                    </motion.div>

                    <motion.div variants={fadeUp}>
                        {tab === 'tenants' && <TenantsTable tenants={tenants} onOpen={openTenant} />}
                        {tab === 'payments' && <PaymentsTable payments={payments} />}
                        {tab === 'audit' && <AuditTable logs={audit} />}
                    </motion.div>
                </Page>
            </main>

            <TenantPanel tenant={selected} onClose={() => setSelected(null)} onChanged={refresh} />
        </div>
    );
}

const th = 'px-5 py-3 text-left font-medium';
const td = 'px-5 py-3.5';

function Table({ head, children, empty }: { head: React.ReactNode; children: React.ReactNode; empty?: string }) {
    return (
        <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-[15px]">
                <thead className="text-xs uppercase tracking-wider text-ink-soft">
                    <tr className="border-b border-line">{head}</tr>
                </thead>
                <tbody className="divide-y divide-line">{children}</tbody>
            </table>
            {empty && <p className="py-12 text-center text-[15px] text-ink-soft">{empty}</p>}
        </div>
    );
}

function TenantsTable({ tenants, onOpen }: { tenants: any[]; onOpen: (schema: string) => void }) {
    return (
        <Table
            empty={tenants.length === 0 ? 'Aucune organisation pour le moment.' : undefined}
            head={
                <>
                    <th className={th}>Organisation</th>
                    <th className={th}>Plan</th>
                    <th className={th}>Statut</th>
                    <th className={th}>Fin de période</th>
                    <th className={th}>Utilisation</th>
                    <th className={th} />
                </>
            }
        >
            {tenants.map((t, i) => {
                const st = SUBSCRIPTION_STATUSES[t.subscription?.status] || SUBSCRIPTION_STATUSES.active;
                return (
                    <motion.tr key={t.schema_name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="text-ink transition hover:bg-ink/[0.02]">
                        <td className={td}>
                            <p className="font-medium text-ink">{t.name}</p>
                            <p className="text-sm text-ink-soft">{t.primary_domain}</p>
                        </td>
                        <td className={td}>{t.subscription?.plan_name || '—'}</td>
                        <td className={td}>
                            <Badge tone={st.tone}>{st.label}</Badge>
                        </td>
                        <td className={`${td} whitespace-nowrap`}>{formatDate(t.subscription?.current_period_end)}</td>
                        <td className={`${td} whitespace-nowrap text-sm text-ink-muted`}>
                            <span className="inline-flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-ink-soft" />
                                {t.usage.users_count}/{t.usage.max_users ?? '—'}
                            </span>
                            <span className="ml-3 inline-flex items-center gap-1.5">
                                <FolderKanban className="h-4 w-4 text-ink-soft" />
                                {t.usage.projects_count}/{t.usage.max_projects ?? '—'}
                            </span>
                        </td>
                        <td className={`${td} text-right`}>
                            <Button variant="secondary" size="sm" icon={Building2} onClick={() => onOpen(t.schema_name)}>
                                Gérer
                            </Button>
                        </td>
                    </motion.tr>
                );
            })}
        </Table>
    );
}

function PaymentsTable({ payments }: { payments: any[] }) {
    return (
        <Table
            empty={payments.length === 0 ? 'Aucun paiement.' : undefined}
            head={
                <>
                    <th className={th}>Date</th>
                    <th className={th}>Organisation</th>
                    <th className={th}>Plan</th>
                    <th className={`${th} text-right`}>Montant</th>
                    <th className={th}>Statut</th>
                    <th className={th}>Référence</th>
                </>
            }
        >
            {payments.map((p) => {
                const ps = PAYMENT_STATUSES[p.status] || PAYMENT_STATUSES.pending;
                return (
                    <tr key={p.transaction_id} className="text-ink">
                        <td className={`${td} whitespace-nowrap`}>{formatDate(p.created_at)}</td>
                        <td className={td}>{p.tenant_name}</td>
                        <td className={td}>{p.plan_name}</td>
                        <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                            {fmtMoney(p.amount)} {p.currency}
                        </td>
                        <td className={td}>
                            <Badge tone={ps.tone}>{ps.label}</Badge>
                        </td>
                        <td className={`${td} font-mono text-sm text-ink-soft`}>{p.transaction_id}</td>
                    </tr>
                );
            })}
        </Table>
    );
}

function AuditTable({ logs }: { logs: any[] }) {
    return (
        <Table
            empty={logs.length === 0 ? 'Aucune action enregistrée.' : undefined}
            head={
                <>
                    <th className={th}>Date</th>
                    <th className={th}>Administrateur</th>
                    <th className={th}>Action</th>
                    <th className={th}>Cible</th>
                    <th className={th}>Adresse IP</th>
                </>
            }
        >
            {logs.map((l) => (
                <tr key={l.id} className="text-ink">
                    <td className={`${td} whitespace-nowrap`}>{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                    <td className={td}>{l.actor_email}</td>
                    <td className={`${td} font-mono text-sm text-brand-600`}>{l.action}</td>
                    <td className={td}>{l.target}</td>
                    <td className={`${td} text-ink-soft`}>{l.ip_address || '—'}</td>
                </tr>
            ))}
        </Table>
    );
}

// Panneau latéral d'une organisation : prolonger, suspendre ou réactiver
function TenantPanel({ tenant, onClose, onChanged }: { tenant: any; onClose: () => void; onChanged: () => Promise<void> }) {
    const toast = useToast();
    const confirm = useConfirm();
    const [busy, setBusy] = useState(false);
    const [days, setDays] = useState('30');
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;
    const suspended = tenant?.subscription?.status === 'cancelled';
    const st = tenant && (SUBSCRIPTION_STATUSES[tenant.subscription?.status] || SUBSCRIPTION_STATUSES.active);

    const act = async (fn: () => Promise<any>, message: string) => {
        setBusy(true);
        try {
            await fn();
            await onChanged();
            toast.success(message);
        } catch (e: any) {
            toast.error(e.message || 'Action impossible.');
        } finally {
            setBusy(false);
        }
    };

    const toggleSuspend = async () => {
        if (!suspended) {
            const ok = await confirm({
                title: `Suspendre ${tenant.name} ?`,
                message: 'Ses membres pourront encore consulter leurs données, mais plus rien modifier.',
                confirmLabel: 'Oui, suspendre',
                danger: true,
            });
            if (!ok) return;
        }
        act(() => platformAPI.suspend(tenant.schema_name, !suspended), suspended ? 'Organisation réactivée.' : 'Organisation suspendue.');
    };

    // Rendu dans <body> : la page animée décalerait sinon le « position: fixed »
    return createPortal(
        <AnimatePresence>
            {tenant && (
                <div key="panel" className="fixed inset-0 z-40 flex justify-end">
                    <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%', transition: { duration: 0.2 } }}
                        transition={spring}
                        className="relative h-full w-full max-w-md overflow-y-auto border-l border-line bg-white p-6"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold text-ink">{tenant.name}</h2>
                                <p className="mt-0.5 text-sm text-ink-soft">{tenant.primary_domain}</p>
                            </div>
                            <button onClick={onClose} aria-label="Fermer" className="-mr-2 rounded-lg p-2 text-ink-soft transition hover:bg-ink/[0.06] hover:text-ink">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <Card className="mt-6 space-y-2 p-4 text-[15px]">
                            <p className="flex items-center justify-between text-ink-muted">
                                Plan <span className="font-medium text-ink">{tenant.subscription?.plan_name || '—'}</span>
                            </p>
                            <p className="flex items-center justify-between text-ink-muted">
                                Statut <Badge tone={st.tone}>{st.label}</Badge>
                            </p>
                            <p className="flex items-center justify-between text-ink-muted">
                                Fin de période <span className="font-medium text-ink">{formatDate(tenant.subscription?.current_period_end)}</span>
                            </p>
                        </Card>

                        <div className="mt-6 space-y-3">
                            <Choice
                                label="Prolonger l’abonnement de"
                                columns={2}
                                value={days}
                                onChange={setDays}
                                options={[
                                    { value: '7', label: '7 jours' },
                                    { value: '30', label: '30 jours' },
                                    { value: '90', label: '90 jours' },
                                    { value: '365', label: '1 an' },
                                ]}
                            />
                            <Button
                                icon={CalendarPlus}
                                loading={busy}
                                className="w-full"
                                onClick={() => act(() => platformAPI.extend(tenant.schema_name, Number(days)), `Abonnement prolongé de ${days} jours.`)}
                            >
                                Prolonger
                            </Button>
                        </div>

                        <div className="mt-6 border-t border-line pt-6">
                            <Button variant={suspended ? 'secondary' : 'danger'} icon={suspended ? CheckCircle2 : Ban} disabled={busy} className="w-full" onClick={toggleSuspend}>
                                {suspended ? 'Réactiver l’organisation' : 'Suspendre (lecture seule)'}
                            </Button>
                        </div>

                        {tenant.members && (
                            <div className="mt-6">
                                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
                                    <Users className="h-4 w-4 text-ink-soft" /> Membres ({tenant.members.length})
                                </p>
                                <ul className="space-y-1">
                                    {tenant.members.map((m: any) => (
                                        <li key={m.email} className="flex items-center gap-3 rounded-xl px-2 py-2">
                                            <Avatar name={m.full_name} size="sm" />
                                            <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{m.full_name}</span>
                                            <Badge tone={ROLES[m.role]?.tone}>{ROLES[m.role]?.label || m.role}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="mt-8 flex items-center gap-2 text-sm text-ink-soft">
                            <CreditCard className="h-4 w-4" /> Les paiements de cette organisation sont dans l’onglet « Paiements ».
                        </p>
                    </motion.aside>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
