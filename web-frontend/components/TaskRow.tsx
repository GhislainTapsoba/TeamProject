'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Calendar, FolderKanban } from 'lucide-react';
import { Badge } from '@/components/ui/kit';
import TaskStepButton from '@/components/TaskStepButton';
import { TASK_STATES, type TaskState } from '@/lib/labels';
import { cn, dueLabel } from '@/lib/utils';
import { spring } from '@/lib/motion';

// Une tâche de l'accueil : où elle en est, pour quand, et le bouton de l'étape suivante
export default function TaskRow({ task, onStep }: { task: any; onStep: (task: any) => void }) {
    const done = task.state === 'done';
    const due = dueLabel(task.due_date, done);
    const state = TASK_STATES.find((s) => s.id === task.state);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
            transition={spring}
            className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:flex-row sm:items-center"
        >
            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    {state && <Badge tone={state.tone}>{state.label}</Badge>}
                    {!done && task.priority === 'high' && <Badge tone="danger">Urgent</Badge>}
                </div>
                <p className={cn('text-base font-medium', done ? 'text-zinc-400 line-through' : 'text-white')}>{task.title}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
                    <Link href={`/projects/${task.project}`} className="flex items-center gap-1.5 hover:text-brand-300">
                        <FolderKanban className="h-4 w-4" />
                        {task.project_name}
                    </Link>
                    {due && (
                        <span className={cn('flex items-center gap-1.5', due.late && 'font-medium text-rose-300')}>
                            <Calendar className="h-4 w-4" />
                            {due.text}
                        </span>
                    )}
                </div>
            </div>
            <TaskStepButton state={task.state as TaskState} onClick={() => onStep(task)} className="w-full sm:w-auto" />
        </motion.div>
    );
}
