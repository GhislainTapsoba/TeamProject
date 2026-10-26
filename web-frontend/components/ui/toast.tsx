'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { spring } from '@/lib/motion';

type Toast = { id: number; tone: 'success' | 'error'; message: string };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const push = useCallback((tone: Toast['tone'], message: string) => {
        const id = Date.now() + Math.random();
        setToasts((list) => [...list.slice(-2), { id, tone, message }]);
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
    }, []);

    const [api] = useState<ToastApi>(() => ({
        success: (message) => push('success', message),
        error: (message) => push('error', message),
    }));

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
                <AnimatePresence initial={false}>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 24, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                            transition={spring}
                            role="status"
                            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 shadow-2xl backdrop-blur-xl"
                        >
                            {t.tone === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                            ) : (
                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                            )}
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
}
