'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { billingAPI } from '@/lib/api';
import {
    CreditCard,
    Check,
    Users,
    FolderKanban,
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Loader2,
    Receipt,
    RefreshCw,
} from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    active: { label: 'Actif', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    trial: { label: 'Essai', className: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    past_due: { label: 'En retard', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    cancelled: { label: 'Suspendu', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const PAYMENT_LABELS: Record<string, { label: string; className: string }> = {
    paid: { label: 'Payé', className: 'text-emerald-400' },
    pending: { label: 'En attente', className: 'text-amber-400' },
    failed: { label: 'Échoué', className: 'text-red-400' },
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('fr-FR') : '-');
const formatAmount = (value: string | number) => Number(value).toLocaleString('fr-FR');
const isFree = (plan: any) => !plan || Number(plan.price_monthly) === 0;

type PaymentNotice = { tone: 'pending' | 'success' | 'error'; message: string } | null;

export default function BillingPage() {
    const { user, tenant } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [subscription, setSubscription] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState<number | string | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState<PaymentNotice>(null);

    const loadBillingData = useCallback(async () => {
        try {
            const [subRes, plansRes, paymentsRes] = await Promise.all([
                billingAPI.getSubscription(),
                billingAPI.getPlans(),
                isAdmin ? billingAPI.getPayments() : Promise.resolve({ data: [] }),
            ]);
            setSubscription(subRes.data);
            setPlans(plansRes.data || []);
            setPayments(paymentsRes.data || []);
        } catch (e) {
            setError('Impossible de charger la facturation. Réessayez dans un instant.');
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    // Back from the checkout: follow the payment until the provider confirms it
    const followPayment = useCallback(async (transactionId: string) => {
        setNotice({ tone: 'pending', message: 'Vérification de votre paiement en cours...' });
        for (let attempt = 0; attempt < 15; attempt++) {
            try {
                const { data } = await billingAPI.getPayment(transactionId);
                if (data.status === 'paid') {
                    setNotice({
                        tone: 'success',
                        message: `Paiement confirmé : plan ${data.plan_name} actif jusqu'au ${formatDate(data.period_end)}.`,
                    });
                    await loadBillingData();
                    return;
                }
                if (data.status === 'failed') {
                    setNotice({ tone: 'error', message: 'Le paiement n\'a pas abouti. Aucun montant n\'a été débité pour cet abonnement.' });
                    await loadBillingData();
                    return;
                }
            } catch (e) {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        setNotice({
            tone: 'pending',
            message: 'Votre paiement est toujours en cours de traitement. Votre plan sera activé automatiquement dès sa confirmation.',
        });
    }, [loadBillingData]);

    useEffect(() => {
        loadBillingData();
        const transactionId = new URLSearchParams(window.location.search).get('payment');
        if (transactionId) {
            window.history.replaceState(null, '', window.location.pathname);
            followPayment(transactionId);
        }
    }, [loadBillingData, followPayment]);

    const handleSubscribe = async (planId: number | string) => {
        setError('');
        setCheckoutLoading(planId);
        try {
            const res = await billingAPI.initiateCheckout(planId);
            window.location.href = res.data.payment_url;
        } catch (err: any) {
            setError(err.response?.data?.error || 'Impossible de démarrer le paiement. Réessayez dans un instant.');
            setCheckoutLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
                <div className="h-44 bg-slate-900/50 rounded-2xl border border-slate-800"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-80 bg-slate-900/40 rounded-2xl border border-slate-800"></div>
                    ))}
                </div>
            </div>
        );
    }

    const currentPlan = subscription?.plan_details;
    const status = STATUS_LABELS[subscription?.status] || STATUS_LABELS.active;

    const planAction = (plan: any) => {
        const isCurrent = subscription?.plan === plan.id;
        if (isFree(plan)) {
            return isCurrent
                ? { label: 'Plan actuel', disabled: true }
                : { label: 'Appliqué automatiquement à la fin de l\'abonnement', disabled: true };
        }
        if (isCurrent && subscription.status === 'trial') return { label: 'S\'abonner', disabled: false };
        if (isCurrent) return { label: 'Renouveler pour 1 mois', disabled: false };
        return { label: 'Passer à ce plan', disabled: false };
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Facturation & Abonnements</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                    Gérez le plan de votre organisation <strong>{tenant?.name}</strong> et vos paiements.
                </p>
            </div>

            {notice && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                    notice.tone === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : notice.tone === 'error'
                            ? 'bg-red-500/10 border-red-500/30 text-red-200'
                            : 'bg-sky-500/10 border-sky-500/30 text-sky-100'
                }`}>
                    {notice.tone === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" />
                        : notice.tone === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" />
                            : <Loader2 className="h-5 w-5 shrink-0 animate-spin" />}
                    <span>{notice.message}</span>
                </div>
            )}

            {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-200 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {subscription && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                                Abonnement actuel
                            </span>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-white">
                                    Plan {currentPlan?.display_name || currentPlan?.name}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.className}`}>
                                    {status.label}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                {isFree(currentPlan) ? (
                                    'Gratuit, sans engagement ni date de fin.'
                                ) : subscription.status === 'past_due' ? (
                                    <>Expiré le <strong>{formatDate(subscription.current_period_end)}</strong>. Renouvelez avant le <strong>{formatDate(subscription.grace_until)}</strong> pour conserver votre plan.</>
                                ) : (
                                    <>
                                        {subscription.status === 'trial' ? 'Essai jusqu\'au' : 'Valide jusqu\'au'}{' '}
                                        <strong>{formatDate(subscription.current_period_end)}</strong> ({subscription.days_left} jours restants)
                                    </>
                                )}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                            <CreditCard className="h-5 w-5 text-indigo-400" />
                            <div>
                                <p className="font-semibold text-white">Mobile Money & carte bancaire</p>
                                <p className="text-[10px] text-slate-400">Orange Money, Moov Money, Wave, Visa, Mastercard</p>
                            </div>
                        </div>
                    </div>

                    {subscription.usage && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
                            {[
                                { icon: Users, label: 'Collaborateurs', used: subscription.usage.users_count, max: subscription.usage.max_users, color: 'bg-indigo-500' },
                                { icon: FolderKanban, label: 'Projets', used: subscription.usage.projects_count, max: subscription.usage.max_projects, color: 'bg-purple-500' },
                            ].map(({ icon: Icon, label, used, max, color }) => (
                                <div key={label} className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-slate-300">
                                        <span className="flex items-center gap-1.5">
                                            <Icon className="h-3.5 w-3.5 text-slate-400" /> {label}
                                        </span>
                                        <span className={`font-semibold ${used >= max ? 'text-amber-400' : ''}`}>{used} / {max}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${used >= max ? 'bg-amber-500' : color}`}
                                            style={{ width: `${Math.min(100, (used / Math.max(max, 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div>
                <h2 className="text-base font-bold text-white mb-1">Choisir ou faire évoluer votre plan</h2>
                <p className="text-xs text-slate-400 mb-4">
                    Paiement mensuel, sans engagement. Renouveler le même plan ajoute un mois à la date de fin actuelle.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const isCurrent = subscription?.plan === plan.id;
                        const isPro = plan.name === 'pro';
                        const action = planAction(plan);

                        return (
                            <div
                                key={plan.id}
                                className={`rounded-2xl p-6 flex flex-col justify-between transition-all ${
                                    isCurrent
                                        ? 'bg-slate-900/70 border-2 border-emerald-500/50'
                                        : isPro
                                            ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/10'
                                            : 'bg-slate-900/50 border border-slate-800'
                                }`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-base font-bold text-white tracking-tight">
                                            {plan.display_name || plan.name}
                                        </h3>
                                        {isCurrent ? (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase tracking-wider">
                                                Votre plan
                                            </span>
                                        ) : isPro && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white uppercase tracking-wider">
                                                Populaire
                                            </span>
                                        )}
                                    </div>

                                    <div className="my-5 flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-white">
                                            {formatAmount(plan.price_monthly)}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">XOF / mois</span>
                                    </div>

                                    <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                            <span>Jusqu&apos;à <strong>{plan.max_users}</strong> collaborateurs</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                            <span>Jusqu&apos;à <strong>{plan.max_projects}</strong> projets</span>
                                        </li>
                                        {plan.features?.map((f: string, idx: number) => (
                                            <li key={idx} className="flex items-center gap-2">
                                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {!isAdmin ? (
                                    <p className="text-[11px] text-center text-slate-500">Seul un administrateur peut changer de plan.</p>
                                ) : action.disabled ? (
                                    <p className="py-2.5 text-[11px] text-center text-slate-500">{action.label}</p>
                                ) : (
                                    <button
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={checkoutLoading !== null}
                                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 ${
                                            isPro || isCurrent
                                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                                                : 'bg-slate-800 hover:bg-slate-700 text-white'
                                        }`}
                                    >
                                        {checkoutLoading === plan.id ? (
                                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirection vers le paiement...</>
                                        ) : (
                                            <>
                                                {isCurrent && <RefreshCw className="h-3.5 w-3.5" />}
                                                <span>{action.label}</span>
                                                {!isCurrent && <ArrowRight className="h-3.5 w-3.5" />}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {isAdmin && (
                <div>
                    <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-slate-400" /> Historique des paiements
                    </h2>
                    {payments.length === 0 ? (
                        <p className="text-xs text-slate-500 p-6 rounded-xl border border-slate-800 bg-slate-900/40 text-center">
                            Aucun paiement pour le moment.
                        </p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-900/80 text-slate-400">
                                    <tr>
                                        <th className="text-left font-medium px-4 py-2.5">Date</th>
                                        <th className="text-left font-medium px-4 py-2.5">Plan</th>
                                        <th className="text-right font-medium px-4 py-2.5">Montant</th>
                                        <th className="text-left font-medium px-4 py-2.5">Statut</th>
                                        <th className="text-left font-medium px-4 py-2.5">Valable jusqu&apos;au</th>
                                        <th className="text-left font-medium px-4 py-2.5">Référence</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80">
                                    {payments.map((p) => {
                                        const ps = PAYMENT_LABELS[p.status] || PAYMENT_LABELS.pending;
                                        return (
                                            <tr key={p.transaction_id} className="text-slate-300">
                                                <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(p.created_at)}</td>
                                                <td className="px-4 py-2.5">{p.plan_name}</td>
                                                <td className="px-4 py-2.5 text-right whitespace-nowrap">{formatAmount(p.amount)} {p.currency}</td>
                                                <td className={`px-4 py-2.5 font-semibold ${ps.className}`}>{ps.label}</td>
                                                <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(p.period_end)}</td>
                                                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{p.transaction_id}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
