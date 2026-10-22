'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Clock } from 'lucide-react';
import { billingAPI } from '@/lib/api';

const formatDate = (value: string) => new Date(value).toLocaleDateString('fr-FR');

// Warns about a trial ending soon, an unpaid renewal or a suspended organization
export default function SubscriptionBanner({ isAdmin }: { isAdmin: boolean }) {
    const pathname = usePathname();
    const [subscription, setSubscription] = useState<any>(null);
    const onBillingPage = !!pathname?.startsWith('/settings/billing');

    // Loaded once, and again when leaving the billing page (where a payment may have happened)
    useEffect(() => {
        if (onBillingPage) return;
        billingAPI.getSubscription()
            .then((res) => setSubscription(res.data))
            .catch(() => setSubscription(null));
    }, [onBillingPage]);

    if (!subscription || onBillingPage) {
        return null;
    }

    const planName = subscription.plan_details?.display_name || subscription.plan_details?.name;
    let tone: 'warning' | 'danger' | null = null;
    let message = '';

    if (subscription.status === 'cancelled') {
        tone = 'danger';
        message = 'Votre organisation est suspendue : l\'accès est en lecture seule. Contactez le support.';
    } else if (subscription.status === 'past_due') {
        tone = 'danger';
        message = `Votre abonnement ${planName} a expiré. Renouvelez-le avant le ${formatDate(subscription.grace_until)} pour conserver votre plan.`;
    } else if (subscription.status === 'trial') {
        tone = 'warning';
        message = subscription.days_left > 0
            ? `Essai ${planName} : il vous reste ${subscription.days_left} jour${subscription.days_left > 1 ? 's' : ''}.`
            : `Votre essai ${planName} se termine aujourd'hui.`;
    } else if (!subscription.plan_details?.price_monthly || Number(subscription.plan_details.price_monthly) === 0) {
        return null;
    } else if (subscription.days_left <= 3) {
        tone = 'warning';
        message = `Votre abonnement ${planName} se termine le ${formatDate(subscription.current_period_end)}.`;
    }

    if (!tone) {
        return null;
    }

    const Icon = tone === 'danger' ? AlertTriangle : Clock;
    const styles = tone === 'danger'
        ? 'bg-red-500/10 border-red-500/30 text-red-200'
        : 'bg-amber-500/10 border-amber-500/30 text-amber-100';

    return (
        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b text-xs ${styles}`}>
            <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                {message}
            </span>
            {isAdmin && subscription.status !== 'cancelled' ? (
                <Link
                    href="/settings/billing"
                    className="px-3 py-1 rounded-md font-semibold bg-white/10 hover:bg-white/20 transition"
                >
                    {subscription.status === 'trial' ? 'Choisir un plan' : 'Renouveler'}
                </Link>
            ) : subscription.status !== 'cancelled' && (
                <span className="text-[11px] opacity-80">Prévenez l&apos;administrateur de votre organisation.</span>
            )}
        </div>
    );
}
