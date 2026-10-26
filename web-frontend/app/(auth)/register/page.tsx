'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Building2, Check, Lock, Mail, User } from 'lucide-react';
import { tenantsAPI } from '@/lib/api';
import { errorMessage } from '@/lib/utils';
import { spring } from '@/lib/motion';
import AuthShell from '@/components/AuthShell';
import { Button, ButtonLink } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/kit';

const PLATFORM_DOMAIN = 'deep-technologies.com';

// La création d'organisation n'est possible que depuis le domaine principal
function isTenantHost() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === PLATFORM_DOMAIN || host === 'www.' + PLATFORM_DOMAIN) return false;
    return host.endsWith('.localhost') || host.endsWith('.' + PLATFORM_DOMAIN);
}

const toSubdomain = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9-]/g, '');

export default function RegisterPage() {
    const [form, setForm] = useState({ orgName: '', subdomain: '', adminName: '', email: '', password: '' });
    const [subdomainEdited, setSubdomainEdited] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [created, setCreated] = useState<any>(null);
    const [onTenantHost, setOnTenantHost] = useState<boolean | null>(null);

    useEffect(() => setOnTenantHost(isTenantHost()), []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await tenantsAPI.register({
                organization_name: form.orgName,
                subdomain: form.subdomain,
                admin_name: form.adminName,
                admin_email: form.email,
                admin_password: form.password,
            });
            setCreated(res.data);
        } catch (err) {
            setError(errorMessage(err, "L'organisation n'a pas pu être créée. Vérifiez les informations."));
        } finally {
            setLoading(false);
        }
    };

    if (onTenantHost === null) return null;

    if (onTenantHost) {
        return (
            <AuthShell title="Vous êtes dans une organisation" subtitle="Pour en créer une nouvelle, rendez-vous sur le site principal.">
                <div className="space-y-3">
                    <a
                        href={`https://${PLATFORM_DOMAIN}/register`}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 font-medium text-white transition hover:bg-violet-500"
                    >
                        Aller au site principal <ArrowRight className="h-4 w-4" />
                    </a>
                    <ButtonLink href="/login" variant="ghost" className="w-full">
                        Se connecter à cette organisation
                    </ButtonLink>
                </div>
            </AuthShell>
        );
    }

    if (created) {
        return (
            <AuthShell title="Votre espace est prêt" subtitle={`${created.tenant?.name} est en ligne, avec un essai gratuit du plan Pro.`}>
                <div className="space-y-6">
                    <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ ...spring, delay: 0.2 }}
                        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-400/30"
                    >
                        <Check className="h-8 w-8 text-emerald-300" strokeWidth={2.5} />
                    </motion.div>
                    <p className="rounded-xl border border-white/[0.06] bg-black/30 px-4 py-3 font-mono text-sm text-violet-200">{created.tenant?.domain}</p>
                    <a
                        href={created.login_url || `https://${created.tenant?.domain}/login`}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 font-medium text-white shadow-glow transition hover:from-violet-400"
                    >
                        Accéder à mon espace <ArrowRight className="h-4 w-4" />
                    </a>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Créez votre espace"
            subtitle="Gratuit et prêt en quelques secondes, essai du plan Pro inclus."
            footer={
                <>
                    Déjà une organisation ?{' '}
                    <Link href="/login" className="font-medium text-violet-300 hover:text-violet-200">
                        Se connecter
                    </Link>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                {error && <Notice tone="error">{error}</Notice>}
                <Input
                    label="Nom de l'organisation"
                    icon={Building2}
                    required
                    autoFocus
                    value={form.orgName}
                    onChange={(e) =>
                        setForm({ ...form, orgName: e.target.value, subdomain: subdomainEdited ? form.subdomain : toSubdomain(e.target.value) })
                    }
                    placeholder="Acme"
                />
                <label className="block space-y-1.5">
                    <span className="block text-[13px] font-medium text-zinc-400">Adresse de votre espace</span>
                    <span className="flex h-11 items-center overflow-hidden rounded-xl border border-white/[0.08] bg-black/30 transition focus-within:border-violet-400/60 focus-within:ring-4 focus-within:ring-violet-500/10">
                        <input
                            required
                            value={form.subdomain}
                            onChange={(e) => {
                                setSubdomainEdited(true);
                                setForm({ ...form, subdomain: toSubdomain(e.target.value) });
                            }}
                            placeholder="acme"
                            className="min-w-0 flex-1 bg-transparent px-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                        />
                        <span className="pr-3.5 text-sm text-zinc-500">.{PLATFORM_DOMAIN}</span>
                    </span>
                </label>
                <Input label="Votre nom" icon={User} required autoComplete="name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="Awa Ouédraogo" />
                <Input label="Email" icon={Mail} type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vous@entreprise.com" />
                <Input
                    label="Mot de passe"
                    icon={Lock}
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="8 caractères minimum"
                />
                <Button type="submit" size="lg" loading={loading} className="w-full">
                    Créer mon espace
                    {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
            </form>
        </AuthShell>
    );
}
