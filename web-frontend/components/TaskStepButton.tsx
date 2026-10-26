'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Check, Play, RotateCcw } from 'lucide-react';
import { NEXT_STEP, type TaskState } from '@/lib/labels';
import { cn } from '@/lib/utils';

const styles: Record<TaskState, { icon: React.ElementType; className: string }> = {
    todo: { icon: Play, className: 'bg-brand-500/15 text-brand-800 ring-brand-400/40 hover:bg-brand-500/25' },
    in_progress: { icon: Check, className: 'bg-emerald-500/15 text-emerald-800 ring-emerald-400/40 hover:bg-emerald-500/25' },
    done: { icon: RotateCcw, className: 'bg-ink/[0.04] text-ink-muted ring-line hover:bg-ink/[0.08]' },
};

// Un seul bouton, toujours visible, qui dit clairement l'étape suivante de la tâche
export default function TaskStepButton({ state, onClick, className }: { state: TaskState; onClick: () => void; className?: string }) {
    const { icon: Icon, className: tone } = styles[state];
    return (
        <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn('inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold ring-1 ring-inset transition-colors', tone, className)}
        >
            <Icon className="h-4 w-4" strokeWidth={2.5} />
            {NEXT_STEP[state].label}
        </motion.button>
    );
}
