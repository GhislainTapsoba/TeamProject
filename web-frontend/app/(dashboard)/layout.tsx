'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { CreditCard, FolderKanban, Home, LogOut, Sparkles, UserCircle, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import Notifications from '@/components/Notifications';
import Logo from '@/components/Logo';
import { Avatar } from '@/components/ui/kit';
import { ROLES } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { ease, spring } from '@/lib/motion';

type NavItem = { name: string; short?: string; href: string; icon: React.ElementType };

const MAIN_NAV: NavItem[] = [
    { name: 'Accueil', href: '/dashboard', icon: Home },
    { name: 'Projets', href: '/projects', icon: FolderKanban },
    { name: 'Équipe', href: '/team', icon: Users },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || '';
    const router = useRouter();
    const { user, tenant, logout, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    if (isLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.6, repeat: Infinity }}>
                    <Logo withText={false} />
                </motion.div>
            </div>
        );
    }

    const settingsNav: NavItem[] = [
        { name: 'Mon profil', short: 'Profil', href: '/settings/profile', icon: UserCircle },
        ...(user.role === 'admin' ? [{ name: 'Abonnement', href: '/settings/billing', icon: CreditCard }] : []),
    ];
    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    // Fonction de rendu (et non composant) : la pastille animée ne se remonte pas à chaque rendu
    const navLink = (item: NavItem) => {
        const active = isActive(item.href);
        return (
            <Link
                key={item.href}
                href={item.href}
                className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors', active ? 'text-white' : 'text-zinc-400 hover:text-zinc-100')}
            >
                {active && (
                    <motion.span
                        layoutId="nav-active"
                        transition={spring}
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 to-violet-500/[0.04] ring-1 ring-inset ring-violet-400/20"
                    />
                )}
                <item.icon className={cn('relative h-[18px] w-[18px]', active ? 'text-violet-300' : 'text-zinc-500')} />
                <span className="relative">{item.name}</span>
            </Link>
        );
    };

    return (
        <div className="flex min-h-screen">
            {/* Barre latérale (bureau) */}
            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-black/20 px-3 py-5 backdrop-blur-xl md:flex">
                <div className="px-3">
                    <Logo />
                </div>

                <div className="mx-1 mt-6 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 text-xs font-bold text-white ring-1 ring-white/10">
                        {(tenant?.name || 'TP').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{tenant?.name || 'Mon organisation'}</p>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-500">Plan {tenant?.plan || 'free'}</p>
                    </div>
                </div>

                <nav className="mt-6 space-y-1">
                    {MAIN_NAV.map(navLink)}
                </nav>

                <p className="mb-2 mt-8 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Réglages</p>
                <nav className="space-y-1">
                    {settingsNav.map(navLink)}
                </nav>

                <div className="mt-auto space-y-3">
                    {tenant?.plan === 'free' && user.role === 'admin' && (
                        <Link
                            href="/settings/billing"
                            className="group relative block overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-transparent p-4"
                        >
                            <Sparkles className="h-4 w-4 text-violet-300" />
                            <p className="mt-2 text-sm font-medium text-white">Passer au plan Pro</p>
                            <p className="text-xs text-zinc-400">Plus de membres et de projets.</p>
                            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                        </Link>
                    )}
                    <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
                        <Avatar name={user.full_name} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-100">{user.full_name}</p>
                            <p className="text-xs text-zinc-500">{ROLES[user.role]?.label}</p>
                        </div>
                        <button onClick={logout} title="Se déconnecter" className="rounded-lg p-2 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                {/* Barre du haut */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.04] bg-canvas/60 px-4 backdrop-blur-xl sm:px-8 md:justify-end">
                    <Link href="/dashboard" className="md:hidden">
                        <Logo />
                    </Link>
                    <div className="flex items-center gap-1">
                        <Notifications />
                        <button onClick={logout} title="Se déconnecter" className="rounded-xl p-2 text-zinc-500 transition hover:text-white md:hidden">
                            <LogOut className="h-[18px] w-[18px]" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 px-4 pb-28 pt-6 sm:px-8 md:pb-12 md:pt-8">
                    <SubscriptionBanner isAdmin={user.role === 'admin'} />
                    <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}>
                        {children}
                    </motion.div>
                </main>
            </div>

            {/* Barre d'onglets (mobile) */}
            <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/[0.08] bg-zinc-950/80 p-1.5 shadow-2xl backdrop-blur-2xl md:hidden">
                {[...MAIN_NAV, settingsNav[0]].map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link key={item.href} href={item.href} className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium">
                            {active && <motion.span layoutId="tab-active" transition={spring} className="absolute inset-0 rounded-xl bg-white/[0.07]" />}
                            <item.icon className={cn('relative h-5 w-5', active ? 'text-violet-300' : 'text-zinc-500')} />
                            <span className={cn('relative', active ? 'text-white' : 'text-zinc-500')}>{item.short ?? item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
