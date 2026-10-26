'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Calendar, Check } from 'lucide-react';
import { Badge } from '@/components/ui/kit';
import { PRIORITIES } from '@/lib/labels';
import { cn, formatDate } from '@/lib/utils';
import { spring } from '@/lib/motion';

// Ligne de tâche avec une case à cocher animée pour la marquer terminée
export default function TaskRow({ task, onToggle }: { task: any; onToggle: (task: any) => void }) {
    const done = task.state === 'done';
    const overdue = !done && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
            transition={spring}
            className="group flex items-center gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
        >
            <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => onToggle(task)}
                aria-label={done ? 'Marquer à faire' : 'Marquer terminée'}
                className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                    done ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600 hover:border-violet-400',
                    task.state === 'in_progress' && 'border-violet-400'
                )}
            >
                <motion.span initial={false} animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }} transition={spring}>
                    <Check className="h-3 w-3 text-zinc-950" strokeWidth={3.5} />
                </motion.span>
            </motion.button>

            <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-medium transition-colors', done ? 'text-zinc-500 line-through' : 'text-zinc-100')}>{task.title}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                    <Link href={`/projects/${task.project}`} className="truncate hover:text-violet-300">
                        {task.project_name}
                    </Link>
                    {task.due_date && (
                        <span className={cn('flex shrink-0 items-center gap-1', overdue && 'text-rose-300')}>
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.due_date, { day: 'numeric', month: 'short' })}
                        </span>
                    )}
                </div>
            </div>

            {task.state === 'in_progress' && <Badge tone="accent">En cours</Badge>}
            {!done && task.priority === 'high' && <Badge tone={PRIORITIES.high.tone}>{PRIORITIES.high.label}</Badge>}
        </motion.div>
    );
}
