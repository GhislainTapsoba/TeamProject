'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { tenantsAPI } from '@/lib/api';
import { Building2, Globe, Mail, User, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

const PLATFORM_DOMAIN = 'deep-technologies.com';

function detectTenantSubdomain() {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    if (host === 'localhost' || host === PLATFORM_DOMAIN || host === 'www.' + PLATFORM_DOMAIN) {
        return false;
    }
    return host.endsWith('.localhost') || host.endsWith('.' + PLATFORM_DOMAIN);
}

export default function RegisterTenantPage() {
    const [orgName, setOrgName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState<any>(null);
    const [isTenantSubdomain, setIsTenantSubdomain] = useState<boolean | null>(null);

    useEffect(() => {
        setIsTenantSubdomain(detectTenantSubdomain());
    }, []);

    const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setSubdomain(val);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await tenantsAPI.register({
                organization_name: orgName,
                subdomain,
                admin_name: adminName,
                admin_email: adminEmail,
                admin_password: password,
            });
            setSuccessData(res.data);
        } catch (err: any) {
            console.error('Registration error:', err);
            const msg = err.response?.data?.error ||
                err.response?.data?.subdomain?.[0] ||
                err.response?.data?.detail ||
                err.response?.data?.message ||
                "Erreur lors de la creation de l'organisation. Verifiez les informations.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (isTenantSubdomain === null) {
        return null;
    }

    if (isTenantSubdomain) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-6 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-500/20 mx-auto">
                        TP
                    </div>
                    <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4">
                        <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
                        <h1 className="text-base font-bold text-white">
                            Creation d'organisation indisponible ici
                        </h1>
                        <p className="text-xs text-slate-400">
                            Vous etes sur l'espace d'une organisation existante. Pour creer une nouvelle
                            organisation, rendez-vous sur le site principal.
                        </p>
                        <div className="flex flex-col gap-2 pt-2">
                            <a
                                href={'https://' + PLATFORM_DOMAIN + '/register'}
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition"
                            >
                                <span>Aller au site principal</span>
                                <ArrowRight className="h-4 w-4" />
                            </a>
                            <Link href="/login" className="text-xs text-slate-400 hover:underline">
                                Se connecter a cette organisation
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-lg space-y-6">
                <div className="text-center space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-500/20 mx-auto">
                        TP
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        Creer votre Espace SaaS
                    </h1>
                    <p className="text-xs text-slate-400">
                        Votre propre instance isolee avec domaine dedie, gestion de projets & vue Kanban.
                    </p>
                </div>

                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-xl">
                    {successData ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <h2 className="text-base font-bold text-white">Espace cree avec succes !</h2>
                            <p className="text-xs text-slate-300">
                                Votre organisation <strong>{successData.tenant?.name}</strong> est prete sur son sous-domaine dedie.
                            </p>
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-400 font-mono break-all">
                                {successData.tenant?.domain}
                            </div>
                            <a
                                href={successData.login_url || ('https://' + successData.tenant?.domain + '/login')}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition"
                            >
                                <span>Acceder a votre espace</span>
                                <ArrowRight className="h-4 w-4" />
                            </a>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleRegister} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1.5">Nom de l'organisation *</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                        <input
                                            type="text"
                                            required
                                            value={orgName}
                                            onChange={(e) => {
                                                setOrgName(e.target.value);
                                                if (!subdomain) {
                                                    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                                                }
                                            }}
                                            placeholder="ex: Acme Technologies"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-medium mb-1.5">Sous-domaine dedie *</label>
                                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-indigo-500">
                                        <span className="pl-3 pr-1 text-slate-500">
                                            <Globe className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="text"
                                            required
                                            value={subdomain}
                                            onChange={handleSubdomainChange}
                                            placeholder="acme"
                                            className="w-full bg-transparent px-2 py-2 text-slate-200 placeholder-slate-600 focus:outline-none"
                                        />
                                        <span className="pr-3 text-slate-500 text-[11px] select-none">
                                            .deep-technologies.com
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-slate-300 font-medium mb-1.5">Nom de l'admin</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                            <input
                                                type="text"
                                                required
                                                value={adminName}
                                                onChange={(e) => setAdminName(e.target.value)}
                                                placeholder="Jean Dupont"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-slate-300 font-medium mb-1.5">Email de l'admin</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                            <input
                                                type="email"
                                                required
                                                value={adminEmail}
                                                onChange={(e) => setAdminEmail(e.target.value)}
                                                placeholder="admin@acme.com"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-medium mb-1.5">Mot de passe admin</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                        <input
                                            type="password"
                                            required
                                            minLength={8}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Minimum 8 caracteres"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <span>{loading ? 'Creation en cours...' : "Creer l'organisation"}</span>
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </form>

                            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
                                <p className="text-xs text-slate-400">
                                    Deja une organisation ?{' '}
                                    <Link href="/login" className="text-indigo-400 hover:underline font-semibold">
                                        Se connecter
                                    </Link>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}