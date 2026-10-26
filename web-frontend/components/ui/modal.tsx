'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { spring } from '@/lib/motion';

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children?: React.ReactNode;
};

export function Modal({ open, onClose, title, description, children }: ModalProps) {
    // Rendue dans <body> : un parent animé (transform) décalerait sinon le « position: fixed »
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Échap ferme la fenêtre, et la page derrière ne défile plus
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <div key="modal" className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-white/[0.08] bg-zinc-950/90 shadow-2xl backdrop-blur-2xl sm:rounded-3xl"
                        initial={{ opacity: 0, y: 40, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.97, transition: { duration: 0.18 } }}
                        transition={spring}
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent" />
                        <div className="flex items-start justify-between gap-4 px-6 pt-6">
                            <div>
                                <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
                                {description && <p className="mt-1.5 text-[15px] text-zinc-300">{description}</p>}
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Fermer"
                                className="-mr-2 rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        {children ? <div className="max-h-[75vh] overflow-y-auto px-6 pb-6 pt-5">{children}</div> : <div className="h-4" />}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

export function ModalActions({ children }: { children: React.ReactNode }) {
    return <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>;
}
