'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/field';
import { Notice } from '@/components/ui/kit';

// Page ouverte depuis le lien de l'email « mot de passe oublié »
export default function ResetPasswordPage() {
    const router = useRouter();
    const [ready, setReady] = useState<boolean | null>(null);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Supabase lit le lien et ouvre une session temporaire de récupération
    useEffect(() => {
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
        });
        const timer = setTimeout(() => supabase.auth.getSession().then(({ data }) => setReady(!!data.session)), 2500);
        return () => {
            listener.subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Les deux mots de passe ne sont pas identiques.');
            return;
        }
        setLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
            setLoading(false);
            setError('Ce mot de passe ne peut pas être utilisé. Choisissez-en un autre, plus long.');
            return;
        }
        await supabase.auth.signOut();
        router.push('/login?reset=1');
    };

    if (ready === false) {
        return (
            <AuthShell title="Ce lien ne fonctionne plus" subtitle="Il a peut-être déjà servi ou il est trop ancien.">
                <Link href="/forgot-password" className="flex h-12 w-full items-center justify-center rounded-xl bg-violet-600 font-medium text-white transition hover:bg-violet-500">
                    Recevoir un nouveau lien
                </Link>
            </AuthShell>
        );
    }

    return (
        <AuthShell title="Nouveau mot de passe" subtitle="Choisissez-le, puis vous pourrez vous connecter avec.">
            <form onSubmit={submit} className="space-y-4">
                {error && <Notice tone="error">{error}</Notice>}
                <PasswordInput label="Nouveau mot de passe" icon={Lock} required minLength={8} autoFocus autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="8 caractères minimum." />
                <PasswordInput label="Retapez-le" icon={Lock} required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <Button type="submit" size="lg" loading={loading || ready === null} className="w-full">
                    Enregistrer le mot de passe
                </Button>
            </form>
        </AuthShell>
    );
}
