'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsAPI } from '@/lib/api';
import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    Users,
    UserCircle,
    CreditCard,
    LogOut,
    Bell,
    Check,
    ChevronRight,
    Building2,
    Sparkles,
    Shield
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, tenant, logout, isLoading } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user) {
            loadNotifications();
            const interval = setInterval(loadNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const loadNotifications = async () => {
        try {
            const countRes = await notificationsAPI.getUnreadCount();
            setUnreadCount(countRes.data.unread_count);
        } catch (e) {
            // silent
        }
    };

    const handleOpenNotifications = async () => {
        setNotificationsOpen(!notificationsOpen);
        if (!notificationsOpen) {
            try {
                const res = await notificationsAPI.getAll();
                setNotifications(res.data.results || res.data || []);
            } catch (e) {
                // silent
            }
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsAPI.markAllRead();
            setUnreadCount(0);
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (e) {
            // silent
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                    <p className="text-sm text-slate-400">Chargement de votre espace...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const navigation = [
        {
            group: 'WORK',
            items: [
                { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
                { name: 'Projets', href: '/projects', icon: FolderKanban },
                { name: 'Mes tâches', href: '/tasks', icon: CheckSquare },
            ],
        },
        {
            group: 'ORGANISATION',
            items: [
                { name: 'Équipe', href: '/team', icon: Users },
            ],
        },
        {
            group: 'PARAMÈTRES',
            items: [
                { name: 'Mon profil', href: '/settings/profile', icon: UserCircle },
                { name: 'Facturation & Plans', href: '/settings/billing', icon: CreditCard },
            ],
        },
    ];

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
            {/* Plane-inspired Left Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col justify-between backdrop-blur-xl">
                <div>
                    {/* Workspace / Tenant Header */}
                    <div className="p-4 border-b border-slate-800/80">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                                {tenant?.name ? tenant.name.substring(0, 2).toUpperCase() : 'TP'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-sm font-semibold text-white truncate tracking-tight">
                                    {tenant?.name || 'Mon Organisation'}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                        {tenant?.plan?.toUpperCase() || 'FREE'}
                                    </span>
                                    <span className="text-[11px] text-slate-500 truncate">
                                        {tenant?.schema_name}.teamproject
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Groups */}
                    <nav className="p-3 space-y-6">
                        {navigation.map((section) => (
                            <div key={section.group}>
                                <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    {section.group}
                                </div>
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                                                    isActive
                                                        ? 'bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/30'
                                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                                }`}
                                            >
                                                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                                                <span>{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>

                {/* User Profile & Footer Actions */}
                <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 transition">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
                                {user.first_name ? user.first_name[0] : user.username[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-200 truncate">{user.full_name}</p>
                                <p className="text-[11px] text-slate-500 capitalize">{user.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            title="Se déconnecter"
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="h-14 border-b border-slate-800/80 bg-slate-900/30 px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="text-slate-500 font-medium">{tenant?.name || 'Workspace'}</span>
                        <ChevronRight className="h-3 w-3 text-slate-600" />
                        <span className="text-slate-200 font-medium capitalize">
                            {pathname?.split('/')[1] || 'Dashboard'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notifications Bell */}
                        <div className="relative">
                            <button
                                onClick={handleOpenNotifications}
                                className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
                                title="Notifications"
                            >
                                <Bell className="h-4 w-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-950 animate-pulse" />
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {notificationsOpen && (
                                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50 text-xs">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                                        <span className="font-semibold text-white">Notifications</span>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                                            >
                                                <Check className="h-3 w-3" /> Tout marquer lu
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                        {notifications.length === 0 ? (
                                            <p className="text-slate-500 text-center py-4">Aucune notification.</p>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    className={`p-2 rounded-lg transition ${
                                                        n.read ? 'bg-slate-950/40 text-slate-400' : 'bg-indigo-950/30 border border-indigo-500/20 text-slate-200'
                                                    }`}
                                                >
                                                    <p className="text-xs">{n.message}</p>
                                                    <span className="text-[10px] text-slate-500 mt-1 block">
                                                        {new Date(n.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Upgrade plan button if on free plan */}
                        {tenant?.plan === 'free' && (
                            <Link
                                href="/settings/billing"
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:opacity-90 transition"
                            >
                                <Sparkles className="h-3 w-3" />
                                <span>Passer Pro</span>
                            </Link>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
