'use client';

import React, { useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import TaskStepButton from '@/components/TaskStepButton';
import { NEXT_STEP, TASK_STATES, type TaskState } from '@/lib/labels';
import { cn, dueLabel } from '@/lib/utils';
import { spring } from '@/lib/motion';

type BoardProps = {
    tasks: any[];
    onMove: (task: any, state: TaskState) => void;
    onQuickAdd: (title: string, state: TaskState) => Promise<void>;
    onDelete?: (task: any) => void;
};

// Trois colonnes. Chaque carte a un bouton pour passer à l'étape suivante ;
// le glisser-déposer à la souris reste possible pour ceux qui le connaissent.
export default function KanbanBoard({ tasks, onMove, onQuickAdd, onDelete }: BoardProps) {
    const [dragged, setDragged] = useState<any>(null);
    const [over, setOver] = useState<TaskState | null>(null);

    const drop = (state: TaskState) => {
        if (dragged && dragged.state !== state) onMove(dragged, state);
        setDragged(null);
        setOver(null);
    };

    return (
        <LayoutGroup>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {TASK_STATES.map((column) => {
                    const items = tasks.filter((t) => t.state === column.id);
                    return (
                        <section
                            key={column.id}
                            aria-label={column.label}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (over !== column.id) setOver(column.id);
                            }}
                            onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
                            onDrop={() => drop(column.id)}
                            className={cn(
                                'flex flex-col rounded-3xl border p-3 transition-colors duration-200 md:min-h-[420px]',
                                over === column.id && dragged?.state !== column.id ? 'border-brand-400/50 bg-brand-500/[0.07]' : 'border-line bg-ink/[0.015]'
                            )}
                        >
                            <header className="px-2 pb-3 pt-1">
                                <div className="flex items-center gap-2.5">
                                    <span className={cn('h-2.5 w-2.5 rounded-full', column.dot)} />
                                    <h3 className="text-lg font-semibold text-ink">{column.label}</h3>
                                    <motion.span
                                        key={items.length}
                                        initial={{ scale: 1.4, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="rounded-full bg-ink/[0.08] px-2 py-0.5 text-sm tabular-nums text-ink"
                                    >
                                        {items.length}
                                    </motion.span>
                                </div>
                                <p className="mt-0.5 pl-5 text-sm text-ink-soft">{column.help}</p>
                            </header>

                            <div className="flex-1 space-y-3">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {items.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            dragging={dragged?.id === task.id}
                                            onDragStart={() => setDragged(task)}
                                            onDragEnd={() => {
                                                setDragged(null);
                                                setOver(null);
                                            }}
                                            onStep={() => onMove(task, NEXT_STEP[task.state as TaskState].to)}
                                            onDelete={onDelete && (() => onDelete(task))}
                                        />
                                    ))}
                                </AnimatePresence>
                                {items.length === 0 && (
                                    <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[15px] text-ink-soft">
                                        {dragged ? 'Lâchez la tâche ici' : 'Aucune tâche ici'}
                                    </p>
                                )}
                            </div>

                            {column.id !== 'done' && <QuickAdd onAdd={(title) => onQuickAdd(title, column.id)} />}
                        </section>
                    );
                })}
            </div>
        </LayoutGroup>
    );
}

type CardProps = {
    task: any;
    dragging: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
    onStep: () => void;
    onDelete?: () => void;
};

const TaskCard = React.forwardRef<HTMLDivElement, CardProps>(function TaskCard({ task, dragging, onDragStart, onDragEnd, onStep, onDelete }, ref) {
    const done = task.state === 'done';
    const due = dueLabel(task.due_date, done);

    return (
        <motion.div
            ref={ref}
            layout
            layoutId={`task-${task.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: dragging ? 0.4 : 1, scale: dragging ? 0.98 : 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={spring}
        >
            {/* Le glisser-déposer natif est porté par un élément simple : motion utilise ses propres gestes « drag » */}
            <div
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    onDragStart();
                }}
                onDragEnd={onDragEnd}
                className="rounded-2xl border border-line bg-white p-4 shadow-card transition-colors hover:border-brand-300 md:cursor-grab md:active:cursor-grabbing"
            >
                {!done && task.priority === 'high' && (
                    <Badge tone="danger" className="mb-2">
                        Urgent
                    </Badge>
                )}
                <p className={cn('text-base font-medium leading-snug', done ? 'text-ink-soft line-through' : 'text-ink')}>{task.title}</p>
                {task.description && !done && <p className="mt-1.5 line-clamp-3 text-sm text-ink-muted">{task.description}</p>}

                {(due || task.assignee_details) && (
                    <div className="mt-3 space-y-1.5 text-sm text-ink-muted">
                        {task.assignee_details && (
                            <p className="flex items-center gap-2">
                                <Avatar name={task.assignee_details.full_name} size="sm" />
                                {task.assignee_details.full_name}
                            </p>
                        )}
                        {due && (
                            <p className={cn('flex items-center gap-2', due.late && 'font-medium text-rose-600')}>
                                <Calendar className="h-4 w-4" />
                                {due.text}
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                    <TaskStepButton state={task.state} onClick={onStep} className="flex-1" />
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-ink-soft transition hover:bg-rose-500/10 hover:text-rose-600"
                        >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

function QuickAdd({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSaving(true);
        try {
            await onAdd(title.trim());
            setTitle('');
        } finally {
            setSaving(false);
        }
    };

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-[15px] font-medium text-ink-muted transition hover:border-brand-400/50 hover:bg-brand-500/[0.06] hover:text-ink"
            >
                <Plus className="h-5 w-5" /> Ajouter une tâche
            </button>
        );
    }

    return (
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-2">
            <input
                autoFocus
                value={title}
                readOnly={saving}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && (setTitle(''), setEditing(false))}
                placeholder="Que faut-il faire ?"
                aria-label="Titre de la nouvelle tâche"
                className="h-12 w-full rounded-xl border border-brand-400/60 bg-white px-4 text-base text-ink placeholder:text-ink-soft focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            />
            <div className="flex gap-2">
                <Button type="submit" loading={saving} disabled={!title.trim()} className="flex-1">
                    Ajouter
                </Button>
                <Button type="button" variant="secondary" onClick={() => (setTitle(''), setEditing(false))}>
                    Fermer
                </Button>
            </div>
        </motion.form>
    );
}
