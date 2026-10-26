'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertTriangle, Clock } from 'lucide-react';
import { billingAPI } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

// Prévient d'un essai bientôt terminé, d'un renouvellement impayé ou d'une organisation suspendue
export default function SubscriptionBanner({ isAdmin }: { isAdmin: boolean }) {
    const pathname = usePathname();
    const [subscription, setSubscription] = useState<any>(null);
    const onBillingPage = !!pathname?.startsWith('/settings/billing');

    // Rechargé en quittant la page de facturation, où un paiement a pu avoir lieu
    useEffect(() => {
        if (onBillingPage) return;
        billingAPI
            .getSubscription()
            .then((res) => setSubscription(res.data))
            .catch(() => setSubscription(null));
    }, [onBillingPage]);

    if (!subscription || onBillingPage) return null;

    const planName = subscription.plan_details?.display_name || subscription.plan_details?.name;
    let tone: 'warning' | 'danger' | null = null;
    let message = '';

    if (subscription.status === 'cancelled') {
        tone = 'danger';
        message = "Votre organisation est suspendue : l'accès est en lecture seule. Contactez le support.";
    } else if (subscription.status === 'past_due') {
        tone = 'danger';
        message = `Votre abonnement ${planName} a expiré. Renouvelez-le avant le ${formatDate(subscription.grace_until)} pour le conserver.`;
    } else if (subscription.status === 'trial' && subscription.days_left <= 5) {
        tone = 'warning';
        message =
            subscription.days_left > 0
                ? `Essai ${planName} : encore ${subscription.days_left} jour${subscription.days_left > 1 ? 's' : ''}.`
                : `Votre essai ${planName} se termine aujourd'hui.`;
    } else if (Number(subscription.plan_details?.price_monthly || 0) > 0 && subscription.days_left <= 3) {
        tone = 'warning';
        message = `Votre abonnement ${planName} se termine le ${formatDate(subscription.current_period_end)}.`;
    }

    // Un membre ne peut rien y faire : on ne l'inquiète que si l'accès est vraiment menacé
    if (!tone || (!isAdmin && tone !== 'danger')) return null;

    const Icon = tone === 'danger' ? AlertTriangle : Clock;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'mx-auto mb-6 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-sm',
                tone === 'danger' ? 'border-rose-400/20 bg-rose-500/10 text-rose-800' : 'border-amber-400/20 bg-amber-500/[0.08] text-amber-800'
            )}
        >
            <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0" />
                {message}
            </span>
            {subscription.status !== 'cancelled' &&
                (isAdmin ? (
                    <Link href="/settings/billing" className="rounded-lg bg-ink/[0.05] px-3 py-1 text-xs font-semibold transition hover:bg-ink/[0.06]">
                        {subscription.status === 'trial' ? 'Choisir un plan' : 'Renouveler'}
                    </Link>
                ) : (
                    <span className="text-xs opacity-80">Prévenez l&apos;administrateur de votre organisation.</span>
                ))}
        </motion.div>
    );
}
