'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { spring } from '@/lib/motion';
import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/kit';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        // Le lien ramène sur la même organisation, où l'on choisit le nouveau mot de passe
        const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        setLoading(false);
        if (sendError) {
            setError("L'email n'a pas pu être envoyé. Patientez une minute, puis réessayez.");
            return;
        }
        setSent(true);
    };

    const back = (
        <Link href="/login" className="inline-flex items-center gap-2 font-medium text-brand-300 hover:text-brand-200">
            <ArrowLeft className="h-4 w-4" /> Retour à la connexion
        </Link>
    );

    if (sent) {
        return (
            <AuthShell title="Regardez vos emails" subtitle={`Si un compte existe pour ${email}, nous venons de lui envoyer un lien.`} footer={back}>
                <div className="space-y-5">
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={spring}
                        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/15 ring-1 ring-brand-400/30"
                    >
                        <MailCheck className="h-8 w-8 text-brand-300" />
                    </motion.div>
                    <ol className="space-y-3 text-base text-zinc-200">
                        <li>1. Ouvrez l&apos;email que nous venons de vous envoyer.</li>
                        <li>2. Cliquez sur le lien qu&apos;il contient.</li>
                        <li>3. Choisissez votre nouveau mot de passe.</li>
                    </ol>
                    <p className="text-[15px] text-zinc-400">Rien reçu après quelques minutes ? Regardez dans les courriers indésirables (spam).</p>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell title="Mot de passe oublié" subtitle="Indiquez votre email : nous vous envoyons un lien pour en choisir un nouveau." footer={back}>
            <form onSubmit={submit} className="space-y-4">
                {error && <Notice tone="error">{error}</Notice>}
                <Input label="Votre email" icon={Mail} type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" />
                <Button type="submit" size="lg" loading={loading} className="w-full">
                    Recevoir le lien
                </Button>
            </form>
        </AuthShell>
    );
}
