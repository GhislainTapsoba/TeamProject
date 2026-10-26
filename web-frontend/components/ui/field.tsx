import React from 'react';
import { cn } from '@/lib/utils';

const control =
    'w-full rounded-xl border border-white/[0.08] bg-black/30 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 transition duration-200 hover:border-white/[0.14] focus:border-violet-400/60 focus:bg-black/40 focus:outline-none focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50';

type FieldProps = { label?: string; hint?: string; icon?: React.ElementType; className?: string };

function Wrapper({ label, hint, className, children }: FieldProps & { children: React.ReactNode }) {
    return (
        <label className={cn('block space-y-1.5', className)}>
            {label && <span className="block text-[13px] font-medium text-zinc-400">{label}</span>}
            {children}
            {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
        </label>
    );
}

export function Input({ label, hint, icon: Icon, className, ...props }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <Wrapper label={label} hint={hint} className={className}>
            <span className="relative block">
                {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />}
                <input className={cn(control, 'h-11', Icon && 'pl-10')} {...props} />
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

export function Select({ label, hint, className, children, ...props }: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <Wrapper label={label} hint={hint} className={className}>
            <select className={cn(control, 'h-11 cursor-pointer appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10')} style={{ backgroundImage: CHEVRON }} {...props}>
                {children}
            </select>
        </Wrapper>
    );
}

const CHEVRON =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";
