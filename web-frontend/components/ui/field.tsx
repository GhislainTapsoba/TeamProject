'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const control =
    'w-full rounded-xl border border-white/[0.12] bg-black/30 px-4 text-base text-zinc-50 placeholder:text-zinc-500 transition duration-200 hover:border-white/[0.2] focus:border-violet-400/70 focus:bg-black/40 focus:outline-none focus:ring-4 focus:ring-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50';

type FieldProps = { label?: string; hint?: string; icon?: React.ElementType; className?: string };

function Wrapper({ label, hint, className, children }: FieldProps & { children: React.ReactNode }) {
    return (
        <label className={cn('block space-y-2', className)}>
            {label && <span className="block text-sm font-medium text-zinc-200">{label}</span>}
            {children}
            {hint && <span className="block text-sm text-zinc-400">{hint}</span>}
        </label>
    );
}

export function Input({ label, hint, icon: Icon, className, ...props }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <Wrapper label={label} hint={hint} className={className}>
            <span className="relative block">
                {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />}
                <input className={cn(control, 'h-12', Icon && 'pl-12')} {...props} />
            </span>
        </Wrapper>
    );
}

// Mot de passe avec un bouton « Afficher » : on vérifie ce qu'on a tapé
export function PasswordInput({ label, hint, icon: Icon, className, ...props }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
    const [visible, setVisible] = useState(false);
    return (
        <Wrapper label={label} hint={hint} className={className}>
            <span className="relative block">
                {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />}
                <input className={cn(control, 'h-12 pr-28', Icon && 'pl-12')} type={visible ? 'text' : 'password'} {...props} />
                <button
                    type="button"
                    onClick={() => setVisible(!visible)}
                    className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {visible ? 'Masquer' : 'Afficher'}
                </button>
            </span>
        </Wrapper>
    );
}

export function Textarea({ label, hint, className, ...props }: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <Wrapper label={label} hint={hint} className={className}>
            <textarea className={cn(control, 'resize-none py-3')} rows={3} {...props} />
        </Wrapper>
    );
}
