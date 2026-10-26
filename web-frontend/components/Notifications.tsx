'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '@/lib/api';
import { cn, formatDate, listOf } from '@/lib/utils';
import { spring } from '@/lib/motion';

export default function Notifications() {
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const [items, setItems] = useState<any[]>([]);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = () => notificationsAPI.getUnreadCount().then((res) => setUnread(res.data.unread_count)).catch(() => {});
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, []);

    // Un clic en dehors du panneau le referme
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const toggle = () => {
        setOpen(!open);
        if (!open) notificationsAPI.getAll().then((res) => setItems(listOf(res))).catch(() => {});
    };

    const markAllRead = () =>
        notificationsAPI
            .markAllRead()
            .then(() => {
                setUnread(0);
                setItems(items.map((n) => ({ ...n, read: true })));
            })
            .catch(() => {});

    return (
        <div ref={ref} className="relative">
            <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={toggle}
                aria-label="Notifications"
                className="relative flex h-10 items-center gap-2 rounded-xl px-2.5 text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
            >
                <motion.span animate={unread > 0 ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ duration: 0.6, delay: 0.4 }}>
                    <Bell className="h-5 w-5" />
                </motion.span>
                <span className="hidden text-sm font-medium sm:inline">Notifications</span>
                <AnimatePresence>
                    {unread > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute left-6 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-xs font-semibold text-white ring-2 ring-canvas"
                        >
                            {unread > 9 ? '9+' : unread}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.15 } }}
                        transition={spring}
                        style={{ transformOrigin: 'top right' }}
                        className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/95 shadow-2xl backdrop-blur-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                            <span className="text-sm font-semibold text-white">Notifications</span>
                            {unread > 0 && (
                                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200">
                                    <CheckCheck className="h-3.5 w-3.5" /> Tout lire
                                </button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto p-2">
                            {items.length === 0 ? (
                                <p className="py-10 text-center text-sm text-zinc-400">Vous êtes à jour.</p>
                            ) : (
                                items.map((n, i) => (
                                    <motion.div
                                        key={n.id}
                                        initial={{ opacity: 0, x: 8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className={cn('flex gap-3 rounded-xl px-3 py-2.5', !n.read && 'bg-violet-500/[0.07]')}
                                    >
                                        <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-violet-400')} />
                                        <div className="min-w-0">
                                            <p className={cn('text-[15px]', n.read ? 'text-zinc-400' : 'text-zinc-50')}>{n.message}</p>
                                            <p className="mt-0.5 text-xs text-zinc-400">
                                                {formatDate(n.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="w-full border-t border-white/[0.06] py-3 text-[15px] font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
                        >
                            Fermer
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
