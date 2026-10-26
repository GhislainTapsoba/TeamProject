'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, CreditCard, FolderKanban, Receipt, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { billingAPI } from '@/lib/api';
import { PAYMENT_STATUSES, SUBSCRIPTION_STATUSES } from '@/lib/labels';
import { cn, errorMessage, formatDate } from '@/lib/utils';
import { fadeUp, spring } from '@/lib/motion';
import { Badge, Card, Notice, Page, PageHeader, Progress, Skeleton } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

const formatAmount = (value: string | number) => Number(value).toLocaleString('fr-FR');
const isFree = (plan: any) => !plan || Number(plan.price_monthly) === 0;

type PaymentNotice = { tone: 'info' | 'success' | 'error'; message: string } | null;

export default function BillingPage() {
    const { user } = useAuth();
    const toast = useToast();
    const isAdmin = user?.role === 'admin';
    const [subscription, setSubscription] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkout, setCheckout] = useState<number | string | null>(null);
    const [notice, setNotice] = useState<PaymentNotice>(null);

    const load = useCallback(async () => {
        try {
            const [subRes, plansRes, paymentsRes] = await Promise.all([
                billingAPI.getSubscription(),
                billingAPI.getPlans(),
                isAdmin ? billingAPI.getPayments() : Promise.resolve({ data: [] }),
            ]);
            setSubscription(subRes.data);
            setPlans(plansRes.data || []);
            setPayments(paymentsRes.data || []);
        } catch {
            toast.error('Impossible de charger la facturation.');
        } finally {
            setLoading(false);
        }
    }, [isAdmin, toast]);

    // Au retour du paiement : on suit la transaction jusqu'à sa confirmation
    const followPayment = useCallback(
        async (transactionId: string) => {
            setNotice({ tone: 'info', message: 'Vérification de votre paiement…' });
            for (let attempt = 0; attempt < 15; attempt++) {
                try {
                    const { data } = await billingAPI.getPayment(transactionId);
                    if (data.status === 'paid') {
                        setNotice({ tone: 'success', message: `Paiement confirmé : plan ${data.plan_name} actif jusqu'au ${formatDate(data.period_end)}.` });
                        await load();
                        return;
                    }
                    if (data.status === 'failed') {
                        setNotice({ tone: 'error', message: "Le paiement n'a pas abouti. Aucun montant n'a été débité." });
                        await load();
                        return;
                    }
                } catch {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
            setNotice({ tone: 'info', message: 'Votre paiement est encore en traitement. Le plan sera activé automatiquement dès sa confirmation.' });
        },
        [load]
    );

    useEffect(() => {
        load();
        const transactionId = new URLSearchParams(window.location.search).get('payment');
        if (transactionId) {
            window.history.replaceState(null, '', window.location.pathname);
            followPayment(transactionId);
        }
    }, [load, followPayment]);

    const subscribe = async (planId: number | string) => {
        setCheckout(planId);
        try {
            const res = await billingAPI.initiateCheckout(planId);
            window.location.href = res.data.payment_url;
        } catch (err) {
            toast.error(errorMessage(err, 'Impossible de démarrer le paiement.'));
            setCheckout(null);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-5xl space-y-6">
                <Skeleton className="h-48" />
                <div className="grid gap-4 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-80" />
                    ))}
                </div>
            </div>
        );
    }

    const current = subscription?.plan_details;
    const status = SUBSCRIPTION_STATUSES[subscription?.status] || SUBSCRIPTION_STATUSES.active;

    const actionFor = (plan: any) => {
        const isCurrent = subscription?.plan === plan.id;
        if (isFree(plan)) return { label: isCurrent ? 'Plan actuel' : "Appliqué à la fin de l'abonnement", disabled: true };
        if (isCurrent && subscription.status === 'trial') return { label: "S'abonner", disabled: false };
        if (isCurrent) return { label: 'Renouveler 1 mois', disabled: false };
        return { label: 'Choisir ce plan', disabled: false };
    };

    return (
        <Page className="max-w-5xl">
            <PageHeader title="Abonnement" subtitle="Paiement mensuel par Mobile Money ou carte, sans engagement." />

            {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}

            {subscription && (
                <Card className="relative overflow-hidden p-6 sm:p-8">
                    <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" />
                    <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-widest text-brand-300">Plan actuel</p>
                            <div className="mt-2 flex items-center gap-3">
                                <h2 className="text-3xl font-semibold tracking-tight text-white">{current?.display_name || current?.name}</h2>
                                <Badge tone={status.tone}>{status.label}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-zinc-400">
                                {isFree(current)
                                    ? 'Gratuit, sans date de fin.'
                                    : subscription.status === 'past_due'
                                      ? `Expiré le ${formatDate(subscription.current_period_end)}. Renouvelez avant le ${formatDate(subscription.grace_until)}.`
                                      : `${subscription.status === 'trial' ? 'Essai jusqu’au' : 'Valide jusqu’au'} ${formatDate(subscription.current_period_end)} · ${subscription.days_left} jours restants`}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3 text-sm">
                            <CreditCard className="h-5 w-5 text-brand-300" />
                            <div>
                                <p className="font-medium text-white">Mobile Money et carte</p>
                                <p className="text-xs text-zinc-400">Orange Money, Moov, Wave, Visa, Mastercard</p>
                            </div>
                        </div>
                    </div>

                    {subscription.usage && (
                        <div className="relative mt-8 grid grid-cols-1 gap-6 border-t border-white/[0.06] pt-6 sm:grid-cols-2">
                            {[
                                { icon: Users, label: 'Membres', used: subscription.usage.users_count, max: subscription.usage.max_users },
                                { icon: FolderKanban, label: 'Projets', used: subscription.usage.projects_count, max: subscription.usage.max_projects },
                            ].map(({ icon: Icon, label, used, max }) => (
                                <div key={label} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-2 text-zinc-300">
                                            <Icon className="h-4 w-4 text-zinc-400" /> {label}
                                        </span>
                                        <span className={cn('tabular-nums', used >= max ? 'text-amber-300' : 'text-zinc-400')}>
                                            {used} / {max}
                                        </span>
                                    </div>
                                    <Progress value={(used / Math.max(max, 1)) * 100} tone={used >= max ? 'warning' : 'accent'} />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            <motion.div variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {plans.map((plan) => {
                    const isCurrent = subscription?.plan === plan.id;
                    const featured = plan.name === 'pro';
                    const action = actionFor(plan);
                    return (
                        <motion.div
                            key={plan.id}
                            variants={fadeUp}
                            whileHover={{ y: -6 }}
                            transition={spring}
                            className={cn(
                                'relative flex flex-col rounded-3xl p-6',
                                featured ? 'bg-gradient-to-b from-brand-500/20 via-zinc-900/80 to-zinc-900/80 shadow-glow' : 'glass',
                                isCurrent && !featured && 'ring-1 ring-emerald-400/30'
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-white">{plan.display_name || plan.name}</h3>
                                {isCurrent ? <Badge tone="success">Votre plan</Badge> : featured && <Badge tone="accent">Populaire</Badge>}
                            </div>
                            <p className="mt-5 flex items-baseline gap-1.5">
                                <span className="text-4xl font-semibold tracking-tight text-white">{formatAmount(plan.price_monthly)}</span>
                                <span className="text-sm text-zinc-400">XOF / mois</span>
                            </p>
                            <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">
                                {[`Jusqu'à ${plan.max_users} membres`, `Jusqu'à ${plan.max_projects} projets`, ...(plan.features || [])].map((f: string) => (
                                    <li key={f} className="flex items-start gap-2.5">
                                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/15">
                                            <Check className="h-2.5 w-2.5 text-emerald-300" strokeWidth={3} />
                                        </span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-8">
                                {!isAdmin ? (
                                    <p className="text-center text-xs text-zinc-400">Seul un administrateur peut changer de plan.</p>
                                ) : action.disabled ? (
                                    <p className="py-2.5 text-center text-xs text-zinc-400">{action.label}</p>
                                ) : (
                                    <Button
                                        className="w-full"
                                        variant={featured || isCurrent ? 'primary' : 'secondary'}
                                        icon={isCurrent ? RefreshCw : undefined}
                                        loading={checkout === plan.id}
                                        disabled={checkout !== null}
                                        onClick={() => subscribe(plan.id)}
                                    >
                                        {action.label}
                                        {!isCurrent && <ArrowRight className="h-4 w-4" />}
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {isAdmin && (
                <motion.section variants={fadeUp} className="space-y-4">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                        <Receipt className="h-4 w-4 text-zinc-400" /> Historique des paiements
                    </h2>
                    {payments.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-white/[0.08] py-10 text-center text-sm text-zinc-400">Aucun paiement pour le moment.</p>
                    ) : (
                        <div className="glass overflow-x-auto rounded-2xl">
                            <table className="w-full text-sm">
                                <thead className="text-left text-xs uppercase tracking-wider text-zinc-400">
                                    <tr className="border-b border-white/[0.06]">
                                        <th className="px-5 py-3 font-medium">Date</th>
                                        <th className="px-5 py-3 font-medium">Plan</th>
                                        <th className="px-5 py-3 text-right font-medium">Montant</th>
                                        <th className="px-5 py-3 font-medium">Statut</th>
                                        <th className="px-5 py-3 font-medium">Jusqu&apos;au</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {payments.map((p) => {
                                        const ps = PAYMENT_STATUSES[p.status] || PAYMENT_STATUSES.pending;
                                        return (
                                            <tr key={p.transaction_id} className="text-zinc-300" title={p.transaction_id}>
                                                <td className="whitespace-nowrap px-5 py-3">{formatDate(p.created_at)}</td>
                                                <td className="px-5 py-3">{p.plan_name}</td>
                                                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                                                    {formatAmount(p.amount)} {p.currency}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <Badge tone={ps.tone}>{ps.label}</Badge>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3">{formatDate(p.period_end)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.section>
            )}
        </Page>
    );
}
