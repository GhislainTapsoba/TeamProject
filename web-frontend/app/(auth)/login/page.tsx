'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/kit';

export default function LoginPage() {
    const router = useRouter();
    const { login, tenant } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
                    <Link href="/register" className="font-medium text-violet-300 hover:text-violet-200">
                        Créer une organisation
                    </Link>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                {error && <Notice tone="error">{error}</Notice>}
                <Input label="Email" icon={Mail} type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" />
                <Input label="Mot de passe" icon={Lock} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <Button type="submit" size="lg" loading={loading} className="w-full">
                    Se connecter
                    {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
            </form>
        </AuthShell>
    );
}
