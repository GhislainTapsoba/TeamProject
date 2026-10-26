'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import Logo from '@/components/Logo';
import { ease, fadeUp } from '@/lib/motion';

// Écran d'authentification : formulaire à gauche, aperçu animé du produit à droite
export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            <div className="flex flex-col px-6 py-8 sm:px-12">
                <Link href="/">
                    <Logo />
                </Link>
                <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07 } } }} className="m-auto w-full max-w-sm py-12">
                    <motion.h1 variants={fadeUp} className="text-3xl font-semibold tracking-tight text-white">
                        {title}
                    </motion.h1>
                    {subtitle && (
                        <motion.p variants={fadeUp} className="mt-2 text-sm text-zinc-400">
                            {subtitle}
                        </motion.p>
                    )}
                    <motion.div variants={fadeUp} className="mt-8">
                        {children}
                    </motion.div>
                    {footer && (
                        <motion.div variants={fadeUp} className="mt-8 text-center text-sm text-zinc-500">
                            {footer}
                        </motion.div>
                    )}
                </motion.div>
            </div>

            <div className="relative hidden overflow-hidden border-l border-white/[0.06] lg:block">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-indigo-900/20 to-transparent" />
                <motion.div
                    className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-violet-500/30 blur-[100px]"
                    animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
                    transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-sky-500/20 blur-[100px]"
                    animate={{ x: [0, -50, 0], y: [0, 30, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                />
                <BoardPreview />
            </div>
        </div>
    );
}

const PREVIEW = [
    { title: 'À faire', dot: 'bg-zinc-400', cards: ['Maquettes de la page d’accueil', 'Préparer la réunion client'] },
    { title: 'En cours', dot: 'bg-violet-400', cards: ['Intégration du paiement', 'Rédiger la documentation'] },
    { title: 'Terminé', dot: 'bg-emerald-400', cards: ['Choisir le nom du produit'] },
];

function BoardPreview() {
    return (
        <div className="relative flex h-full items-center justify-center p-12">
            <motion.div
                initial={{ opacity: 0, y: 40, rotateX: 18, rotateZ: -4 }}
                animate={{ opacity: 1, y: 0, rotateX: 8, rotateZ: -3 }}
                transition={{ duration: 1.2, ease, delay: 0.2 }}
                style={{ transformPerspective: 1200 }}
                className="glass grid w-full max-w-xl grid-cols-3 gap-3 rounded-3xl p-4"
            >
                {PREVIEW.map((col, c) => (
                    <div key={col.title} className="space-y-2">
                        <p className="flex items-center gap-2 px-1 text-xs font-medium text-zinc-300">
                            <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                            {col.title}
                        </p>
                        {col.cards.map((card, i) => (
                            <motion.div
                                key={card}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: [0, -4, 0] }}
                                transition={{
                                    opacity: { delay: 0.6 + (c * 2 + i) * 0.12 },
                                    y: { duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: c * 0.8 },
                                }}
                                className="rounded-xl border border-white/[0.06] bg-zinc-900/80 p-3 text-[11px] leading-snug text-zinc-300 shadow-card"
                            >
                                {card}
                                <div className="mt-2 h-1 w-1/2 rounded-full bg-white/[0.06]" />
                            </motion.div>
                        ))}
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
