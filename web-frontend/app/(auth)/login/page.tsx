'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/field';
import { Notice } from '@/components/ui/kit';

export default function LoginPage() {
    const router = useRouter();
    const { login, tenant } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetDone, setResetDone] = useState(false);
    const [removed, setRemoved] = useState(false);

    // Retour de la page « nouveau mot de passe », ou personne retirée de l'organisation
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setResetDone(params.has('reset'));
        setRemoved(params.has('removed'));
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Email ou mot de passe incorrect.');
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Bon retour"
            subtitle={tenant?.name ? `Connectez-vous à l’espace ${tenant.name}.` : 'Connectez-vous à votre espace.'}
            footer={
                <>
                    Pas encore d&apos;espace ?{' '}
                    <Link href="/register" className="font-medium text-brand-300 hover:text-brand-200">
                        Créer une organisation
                    </Link>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                {resetDone && !error && <Notice tone="success">Votre mot de passe a bien été changé. Connectez-vous avec le nouveau.</Notice>}
                {removed && !error && (
                    <Notice tone="info">Vous ne faites plus partie de cette organisation. Si c&apos;est une erreur, contactez son administrateur.</Notice>
                )}
                {error && <Notice tone="error">{error}</Notice>}
                <Input label="Email" icon={Mail} type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" />
                <PasswordInput label="Mot de passe" icon={Lock} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <Button type="submit" size="lg" loading={loading} className="w-full">
                    Se connecter
                    {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
                <Link href="/forgot-password" className="block text-center text-[15px] font-medium text-brand-300 hover:text-brand-200">
                    J&apos;ai oublié mon mot de passe
                </Link>
            </form>
        </AuthShell>
    );
}
