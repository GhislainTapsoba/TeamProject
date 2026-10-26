'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';

export type ChoiceOption<T extends string> = {
    value: T;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    activeClass?: string;
};

// Gros boutons à toucher plutôt qu'une liste déroulante : toutes les options sont visibles
export function Choice<T extends string>({
    label,
    options,
    value,
    onChange,
    columns = 3,
}: {
    label: string;
    options: ChoiceOption<T>[];
    value: T;
    onChange: (value: T) => void;
    columns?: 1 | 2 | 3;
}) {
    const grid = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[columns];
    return (
        <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
            <div role="radiogroup" className={cn('grid gap-2', grid)}>
                {options.map((o) => {
                    const active = o.value === value;
                    return (
                        <motion.button
                            key={o.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onChange(o.value)}
                            className={cn(
                                'relative flex min-h-12 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[15px] transition-colors',
                                active
                                    ? o.activeClass || 'border-brand-400/70 bg-brand-500/15 text-ink'
                                    : 'border-line bg-ink/[0.02] text-ink-muted hover:border-brand-300 hover:bg-ink/[0.05]'
                            )}
                        >
                            {o.icon}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{o.label}</span>
                                {o.description && <span className="mt-0.5 block text-sm text-ink-soft">{o.description}</span>}
                            </span>
                            {active && (
                                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500">
                                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                </motion.span>
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </fieldset>
    );
}

const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return toIso(d);
};

// Date en un clic (aujourd'hui, demain, dans une semaine) ; le calendrier reste disponible
export function DateChoice({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    const presets = [
        { value: '', label: 'Pas de date' },
        { value: inDays(0), label: "Aujourd'hui" },
        { value: inDays(1), label: 'Demain' },
        { value: inDays(7), label: 'Dans 1 semaine' },
    ];
    const isPreset = presets.some((p) => p.value === value);
    const [custom, setCustom] = useState(!isPreset);

    return (
        <div className="space-y-2">
            <Choice
                label={label}
                columns={2}
                value={custom ? '__custom' : value}
                onChange={(v) => {
                    setCustom(false);
                    onChange(v);
                }}
                options={presets}
            />
            {custom ? (
                <input
                    type="date"
                    autoFocus
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-12 w-full rounded-xl border border-brand-400/70 bg-white px-4 text-base text-ink focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                />
            ) : (
                <button type="button" onClick={() => setCustom(true)} className="text-sm font-medium text-brand-600 underline-offset-4 hover:underline">
                    Choisir une autre date dans le calendrier
                </button>
            )}
        </div>
    );
}
