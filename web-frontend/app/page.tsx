'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Bell, FolderKanban, ShieldCheck, Smartphone, Users, Zap } from 'lucide-react';
import Logo from '@/components/Logo';
import { ButtonLink } from '@/components/ui/button';
import { ease, fadeUp } from '@/lib/motion';

const FEATURES = [
    { icon: FolderKanban, title: 'Un tableau clair', text: 'À faire, en cours, terminé. Glissez une carte, c’est fait.' },
    { icon: Users, title: 'Toute l’équipe', text: 'Invitez vos collègues, assignez une tâche, chacun sait quoi faire.' },
    { icon: Bell, title: 'Prévenu au bon moment', text: 'Une notification et un email dès qu’une tâche vous est confiée.' },
    { icon: ShieldCheck, title: 'Vos données à part', text: 'Chaque organisation a son espace isolé et son adresse dédiée.' },
    { icon: Smartphone, title: 'Paiement local', text: 'Orange Money, Moov, Wave ou carte bancaire, sans engagement.' },
    { icon: Zap, title: 'Rapide à prendre en main', text: 'Aucune formation : votre espace est prêt en quelques secondes.' },
];

export default function LandingPage() {
    const { scrollY } = useScroll();
    const previewY = useTransform(scrollY, [0, 600], [0, -80]);
    const previewRotate = useTransform(scrollY, [0, 600], [12, 0]);

    return (
        <div className="relative overflow-hidden">
            <header className="fixed inset-x-0 top-0 z-30 border-b border-white/[0.04] bg-canvas/60 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                    <Logo />
                    <nav className="flex items-center gap-2">
                        <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-white">
                            Connexion
                        </Link>
                        <ButtonLink href="/register" size="sm">
                            Commencer
                        </ButtonLink>
                    </nav>
                </div>
            </header>

            <main>
                <motion.section
                    initial="hidden"
                    animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.1 } } }}
                    className="mx-auto max-w-4xl px-6 pb-16 pt-40 text-center sm:pt-48"
                >
                    <motion.p
                        variants={fadeUp}
                        className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-xs text-zinc-300"
                    >
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        Gestion de projets en équipe
                    </motion.p>
                    <motion.h1 variants={fadeUp} className="mt-8 text-5xl font-semibold leading-[1.05] tracking-tighter text-white sm:text-7xl">
                        Votre équipe,
                        <br />
                        <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-flame-400 bg-clip-text text-transparent">enfin alignée.</span>
                    </motion.h1>
                    <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
                        Projets, tâches et collègues au même endroit. Simple dès la première minute, agréable tous les jours.
                    </motion.p>
                    <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <ButtonLink href="/register" size="lg">
                            Créer mon espace gratuit <ArrowRight className="h-4 w-4" />
                        </ButtonLink>
                        <ButtonLink href="/login" size="lg" variant="secondary">
                            J&apos;ai déjà un compte
                        </ButtonLink>
                    </motion.div>
                </motion.section>

                {/* Aperçu du produit, qui se redresse au défilement */}
                <section className="mx-auto max-w-5xl px-6" style={{ perspective: 1400 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.1, ease, delay: 0.5 }}
                        style={{ y: previewY, rotateX: previewRotate }}
                        className="glass relative rounded-3xl p-2 shadow-[0_40px_120px_-40px_rgba(8,32,216,0.5)]"
                    >
                        <div className="rounded-[20px] border border-white/[0.05] bg-zinc-950/80 p-5">
                            <div className="mb-5 flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                                <span className="ml-3 text-xs text-zinc-400">acme.deep-technologies.com</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-left">
                                {[
                                    { title: 'À faire', dot: 'bg-zinc-400', cards: ['Préparer l’offre client', 'Maquette mobile', 'Relancer le fournisseur'] },
                                    { title: 'En cours', dot: 'bg-brand-400', cards: ['Intégration Mobile Money', 'Campagne de lancement'] },
                                    { title: 'Terminé', dot: 'bg-emerald-400', cards: ['Choix du logo'] },
                                ].map((col, c) => (
                                    <div key={col.title} className="space-y-2 rounded-2xl bg-white/[0.02] p-2.5">
                                        <p className="flex items-center gap-2 px-1 pb-1 text-xs font-medium text-zinc-300">
                                            <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                                            {col.title}
                                        </p>
                                        {col.cards.map((card, i) => (
                                            <motion.div
                                                key={card}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 1 + (c * 3 + i) * 0.08, ease }}
                                                className="rounded-xl border border-white/[0.06] bg-zinc-900 p-3 text-xs text-zinc-300 sm:text-xs"
                                            >
                                                {card}
                                                <div className="mt-2.5 flex items-center justify-between">
                                                    <span className="h-1 w-10 rounded-full bg-white/[0.07]" />
                                                    <span className="h-4 w-4 rounded-full bg-gradient-to-br from-brand-400/50 to-flame-400/50" />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </section>

                <section className="mx-auto max-w-6xl px-6 py-32">
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: '-80px' }}
                        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                    >
                        <motion.h2 variants={fadeUp} className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            Tout ce qu&apos;il faut, rien de plus.
                        </motion.h2>
                        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map((f) => (
                                <motion.div
                                    key={f.title}
                                    variants={fadeUp}
                                    whileHover={{ y: -4 }}
                                    className="glass group rounded-2xl p-6 transition-colors hover:border-white/[0.12]"
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-brand-400/20 transition group-hover:bg-brand-500/20">
                                        <f.icon className="h-5 w-5 text-brand-300" />
                                    </span>
                                    <h3 className="mt-5 font-semibold text-white">{f.title}</h3>
                                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.text}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </section>

                <section className="mx-auto max-w-4xl px-6 pb-32">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease }}
                        className="relative overflow-hidden rounded-3xl border border-brand-400/20 bg-gradient-to-br from-brand-600/25 via-zinc-950 to-flame-600/15 px-8 py-16 text-center"
                    >
                        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Lancez votre équipe aujourd&apos;hui.</h2>
                        <p className="mx-auto mt-4 max-w-md text-zinc-400">Gratuit pour démarrer, sans carte bancaire.</p>
                        <ButtonLink href="/register" size="lg" className="mt-8">
                            Créer mon espace <ArrowRight className="h-4 w-4" />
                        </ButtonLink>
                    </motion.div>
                </section>
            </main>

            <footer className="border-t border-white/[0.05] py-8">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-zinc-400 sm:flex-row">
                    <Logo className="opacity-70" />
                    <p>© {new Date().getFullYear()} Deep Technologies</p>
                </div>
            </footer>
        </div>
    );
}
