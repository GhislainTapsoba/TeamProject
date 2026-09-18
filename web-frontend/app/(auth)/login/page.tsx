'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login, tenant } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Identifiants invalides. Veuillez vérifier votre email et mot de passe.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Logo & Header */}
                <div className="text-center space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-500/20 mx-auto">
                        TP
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        Connexion à Team Project
                    </h1>
                    <p className="text-xs text-slate-400">
                        {tenant?.name ? `Espace ${tenant.name}` : 'Plateforme collaborative SaaS'}
                    </p>
                </div>

                {/* Login Card */}
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-xl">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                        <div>
                            <label className="block text-slate-300 font-medium mb-1.5">Email professionnel</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nom@entreprise.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-slate-300 font-medium">Mot de passe</label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span>{loading ? 'Connexion en cours...' : 'Se connecter'}</span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
                        <p className="text-xs text-slate-400">
                            Vous souhaitez créer votre organisation ?{' '}
                            <Link href="/register" className="text-indigo-400 hover:underline font-semibold">
                                Créer un espace SaaS
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
