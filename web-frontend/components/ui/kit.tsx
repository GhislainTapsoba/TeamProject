'use client';

import React, { useEffect, useRef } from 'react';
import { animate, motion, useInView } from 'motion/react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { ease, fadeUp, spring } from '@/lib/motion';
import type { Tone } from '@/lib/labels';

const toneClasses: Record<Tone, string> = {
    neutral: 'bg-ink/[0.05] text-ink-muted ring-line',
    accent: 'bg-brand-500/15 text-brand-800 ring-brand-400/25',
    flame: 'bg-flame-500/15 text-flame-800 ring-flame-400/30',
    success: 'bg-emerald-500/15 text-emerald-800 ring-emerald-400/25',
    warning: 'bg-amber-500/15 text-amber-800 ring-amber-400/25',
    danger: 'bg-rose-500/15 text-rose-800 ring-rose-400/25',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', toneClasses[tone], className)}>
            {children}
        </span>
    );
}

export function Card({ className, children, interactive, ...props }: React.ComponentProps<typeof motion.div> & { interactive?: boolean }) {
    return (
        <motion.div
            variants={fadeUp}
            whileHover={interactive ? { y: -3 } : undefined}
            transition={spring}
            className={cn('glass rounded-2xl', interactive && 'transition-colors hover:border-brand-300 hover:bg-ink/[0.04]', className)}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
    return (
        <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
                {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
            </div>
            {action}
        </motion.div>
    );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: React.ElementType; title: string; text?: string; action?: React.ReactNode }) {
    return (
        <motion.div variants={fadeUp} className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
            <motion.div
                initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ ...spring, delay: 0.1 }}
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-flame-500/15 ring-1 ring-line"
            >
                <Icon className="h-6 w-6 text-brand-600" />
            </motion.div>
            <p className="font-medium text-ink">{title}</p>
            {text && <p className="mt-1 max-w-sm text-sm text-ink-soft">{text}</p>}
            {action && <div className="mt-6">{action}</div>}
        </motion.div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('skeleton', className)} />;
}

export function Avatar({ name, size = 'md', className }: { name?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' };
    return (
        <span
            title={name}
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-flame-100 font-semibold text-brand-800 ring-1 ring-brand-200',
                sizes[size],
                className
            )}
        >
            {initials(name)}
        </span>
    );
}

// Sélecteur à onglets : la pastille active glisse d'une option à l'autre
export function Segmented<T extends string>({
    options,
    value,
    onChange,
    id,
}: {
    options: { id: T; label: string; count?: number }[];
    value: T;
    onChange: (value: T) => void;
    id: string;
}) {
    return (
        <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-white p-1">
            {options.map((o) => (
                <button
                    key={o.id}
                    onClick={() => onChange(o.id)}
                    className={cn('relative whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors', value === o.id ? 'text-ink' : 'text-ink-soft hover:text-ink')}
                >
                    {value === o.id && <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-lg bg-ink/[0.08] ring-1 ring-line" />}
                    <span className="relative flex items-center gap-1.5">
                        {o.label}
                        {o.count !== undefined && <span className="text-xs tabular-nums text-ink-soft">{o.count}</span>}
                    </span>
                </button>
            ))}
        </div>
    );
}

export function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });

    useEffect(() => {
        if (!inView || !ref.current) return;
        const node = ref.current;
        const controls = animate(0, value, {
            duration: 1.1,
            ease,
            onUpdate: (v) => (node.textContent = Math.round(v) + suffix),
        });
        return () => controls.stop();
    }, [inView, value, suffix]);

    return (
        <span ref={ref} className="tabular-nums">
            0{suffix}
        </span>
    );
}

export function Progress({ value, className, tone = 'accent' }: { value: number; className?: string; tone?: 'accent' | 'warning' }) {
    return (
        <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]', className)}>
            <motion.div
                className={cn('h-full rounded-full', tone === 'warning' ? 'bg-amber-400' : 'bg-gradient-to-r from-brand-500 to-flame-400')}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                transition={{ duration: 1, ease, delay: 0.15 }}
            />
        </div>
    );
}

export function Notice({ tone, children }: { tone: 'success' | 'error' | 'info'; children: React.ReactNode }) {
    const styles = {
        success: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-800',
        error: 'border-rose-400/20 bg-rose-500/10 text-rose-800',
        info: 'border-sky-400/20 bg-sky-500/10 text-sky-800',
    };
    const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={cn('flex items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-sm', styles[tone])}
        >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{children}</div>
        </motion.div>
    );
}

// Conteneur de page : ses enfants apparaissent en cascade
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className={cn('mx-auto w-full max-w-6xl space-y-8', className)}>
            {children}
        </motion.div>
    );
}
