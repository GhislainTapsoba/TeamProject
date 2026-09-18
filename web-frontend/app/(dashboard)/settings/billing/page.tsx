'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { billingAPI } from '@/lib/api';
import {
    CreditCard,
    Check,
    Sparkles,
    Shield,
    Clock,
    Users,
    FolderKanban,
    AlertCircle,
    ArrowRight
} from 'lucide-react';

export default function BillingPage() {
    const { user, tenant } = useAuth();
    const [subscription, setSubscription] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState<number | string | null>(null);

    useEffect(() => {
        loadBillingData();
    }, []);

    const loadBillingData = async () => {
        try {
            const [subRes, plansRes] = await Promise.all([
                billingAPI.getSubscription(),
                billingAPI.getPlans(),
            ]);
            setSubscription(subRes.data);
            setPlans(plansRes.data || []);
        } catch (e) {
            console.error('Error loading billing:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (planId: number | string) => {
        setCheckoutLoading(planId);
        try {
            const res = await billingAPI.initiateCheckout(planId);
            if (res.data?.payment_url) {
                // Redirect user to CinetPay checkout portal
                window.location.href = res.data.payment_url;
            } else if (res.data?.error) {
                alert(`Erreur d'initialisation de paiement: ${res.data.error}`);
            } else {
                alert('Paiement initié avec succès.');
                loadBillingData();
            }
        } catch (err: any) {
            console.error('Checkout error:', err);
            alert(err.response?.data?.error || 'Une erreur est survenue lors de la création du paiement.');
        } finally {
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

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Facturation & Abonnements</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                    Gérez le plan de votre organisation <strong>{tenant?.name}</strong> et vos paiements CinetPay.
                </p>
            </div>

            {/* Current Subscription Card */}
            {subscription && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                                Abonnement Actuel
                            </span>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-white">
                                    Plan {subscription.plan_details?.display_name || subscription.plan_details?.name}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    subscription.status === 'active'
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                                }`}>
                                    {subscription.status === 'active' ? 'Actif' : 'Expiré'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Valide jusqu'au <strong>{new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}</strong> ({subscription.days_left} jours restants)
                            </p>
                        </div>

                        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                            <CreditCard className="h-5 w-5 text-indigo-400" />
                            <div>
                                <p className="font-semibold text-white">CinetPay Mobile Money & CB</p>
                                <p className="text-[10px] text-slate-400">Orange Money, Moov Money, Carte</p>
                            </div>
                        </div>
                    </div>

                    {/* Usage Quotas */}
                    {subscription.usage && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
                            {/* Users Quota */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-slate-300">
                                    <span className="flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-slate-400" /> Collaborateurs
                                    </span>
                                    <span className="font-semibold">{subscription.usage.users_count} / {subscription.usage.max_users}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{ width: `${Math.min(100, (subscription.usage.users_count / subscription.usage.max_users) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Projects Quota */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-slate-300">
                                    <span className="flex items-center gap-1.5">
                                        <FolderKanban className="h-3.5 w-3.5 text-slate-400" /> Projets actifs
                                    </span>
                                    <span className="font-semibold">{subscription.usage.projects_count} / {subscription.usage.max_projects}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded-full"
                                        style={{ width: `${Math.min(100, (subscription.usage.projects_count / subscription.usage.max_projects) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Plans Comparison */}
            <div>
                <h2 className="text-base font-bold text-white mb-4">Choisir ou faire évoluer votre plan</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const isCurrent = subscription?.plan === plan.id;
                        const isPro = plan.name === 'pro';

                        return (
                            <div
                                key={plan.id}
                                className={`rounded-2xl p-6 flex flex-col justify-between transition-all ${
                                    isPro
                                        ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/10'
                                        : 'bg-slate-900/50 border border-slate-800'
                                }`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-base font-bold text-white tracking-tight">
                                                {plan.display_name || plan.name}
                                            </h3>
                                            <p className="text-xs text-slate-400">Pour équipes en croissance</p>
                                        </div>
                                        {isPro && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white uppercase tracking-wider">
                                                Populaire
                                            </span>
                                        )}
                                    </div>

                                    <div className="my-5 flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-white">
                                            {Number(plan.price_monthly).toLocaleString('fr-FR')}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">XOF / mois</span>
                                    </div>

                                    <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                            <span>Jusqu'à <strong>{plan.max_users}</strong> collaborateurs</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                            <span>Jusqu'à <strong>{plan.max_projects}</strong> projets actifs</span>
                                        </li>
                                        {plan.features?.map((f: string, idx: number) => (
                                            <li key={idx} className="flex items-center gap-2">
                                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    {isCurrent ? (
                                        <button
                                            disabled
                                            className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 font-semibold text-xs cursor-default"
                                        >
                                            Plan Actuel
                                        </button>
                                    ) : user?.role === 'admin' ? (
                                        <button
                                            onClick={() => handleSubscribe(plan.id)}
                                            disabled={checkoutLoading === plan.id}
                                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                                                isPro
                                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                                                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                                            }`}
                                        >
                                            <span>{checkoutLoading === plan.id ? 'Redirection...' : 'Passer à ce plan'}</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </button>
                                    ) : (
                                        <p className="text-[11px] text-center text-slate-500">Contactez l'administrateur pour changer de plan.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
