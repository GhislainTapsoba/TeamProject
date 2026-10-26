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
                    <motion.h1 variants={fadeUp} className="text-3xl font-semibold tracking-tight text-ink">
                        {title}
                    </motion.h1>
                    {subtitle && (
                        <motion.p variants={fadeUp} className="mt-2 text-sm text-ink-soft">
                            {subtitle}
                        </motion.p>
                    )}
                    <motion.div variants={fadeUp} className="mt-8">
                        {children}
                    </motion.div>
                    {footer && (
                        <motion.div variants={fadeUp} className="mt-8 text-center text-sm text-ink-soft">
                            {footer}
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* Panneau bleu du logo, avec une lueur orange qui dérive lentement */}
            <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 lg:block">
                <motion.div
                    className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-brand-400/40 blur-[100px]"
                    animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
                    transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-flame-500/45 blur-[110px]"
                    animate={{ x: [0, -50, 0], y: [0, 30, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                />
                <BoardPreview />
            </div>
        </div>
    );
}

const PREVIEW = [
    { title: 'À faire', dot: 'bg-white', cards: ['Maquettes de la page d’accueil', 'Préparer la réunion client'] },
    { title: 'En cours', dot: 'bg-flame-400', cards: ['Intégration du paiement', 'Rédiger la documentation'] },
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
                className="grid w-full max-w-xl grid-cols-3 gap-3 rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl"
            >
                {PREVIEW.map((col, c) => (
                    <div key={col.title} className="space-y-2">
                        <p className="flex items-center gap-2 px-1 text-xs font-medium text-white">
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
                                className="rounded-xl border border-line bg-white p-3 text-xs leading-snug text-ink-muted shadow-card"
                            >
                                {card}
                                <div className="mt-2 h-1 w-1/2 rounded-full bg-ink/[0.06]" />
                            </motion.div>
                        ))}
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
