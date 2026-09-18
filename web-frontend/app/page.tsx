'use client';

import React from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    FolderKanban,
    CreditCard,
    Shield,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    Users,
    Zap,
    Globe
} from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
            {/* Header */}
            <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/20">
                            TP
                        </div>
                        <span className="font-bold text-base tracking-tight text-white">Team Project</span>
                        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            SaaS Multi-Tenant
                        </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                        <Link
                            href="/login"
                            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition font-medium"
                        >
                            Connexion
                        </Link>
                        <Link
                            href="/register"
                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                        >
                            <span>Créer un espace</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-6 py-16 sm:py-24 text-center space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Nouvelle génération de gestion de projets d'équipe</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight">
                    Pilotez vos projets en équipe avec une clarté <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">inégalée</span>.
                </h1>

                <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal">
                    Plateforme SaaS multi-tenant haute performance inspirée de Plane : tableau Kanban interactif, isolation complète des données, facturation CinetPay et notifications Mailjet.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link
                        href="/register"
                        className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-xl shadow-indigo-600/25 transition flex items-center justify-center gap-2"
                    >
                        <span>Démarrer Gratuitement</span>
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                        href="/login"
                        className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold transition"
                    >
                        Accéder à mon Organisation
                    </Link>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
                    <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/30 transition space-y-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
                            <Shield className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Isolation Multi-Tenant Stricte</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Chaque organisation dispose de son propre schéma PostgreSQL isolé et d'un sous-domaine dédié avec chiffrement des secrets.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/30 transition space-y-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 w-fit">
                            <FolderKanban className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Vue Kanban Intuitive</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Organisation en colonnes <em>À faire</em>, <em>En cours</em> et <em>Terminé</em> inspirée de Plane, sans complexité superflue.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/30 transition space-y-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Paiement CinetPay Intégré</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Souscription transparente par Orange Money, Moov Money et cartes bancaires avec revérification sécurisée côté serveur.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-600">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p>© {new Date().getFullYear()} Team Project — Deep Technologies. Tous droits réservés.</p>
                    <div className="flex items-center gap-4 text-slate-500">
                        <span>Architecture SaaS Multi-Tenant</span>
                        <span>•</span>
                        <span>PostgreSQL Schema Isolation</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
