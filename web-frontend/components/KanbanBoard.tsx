'use client';

import React, { useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui/kit';
import { PRIORITIES, TASK_STATES, type TaskState } from '@/lib/labels';
import { cn, formatDate } from '@/lib/utils';
import { spring } from '@/lib/motion';

type BoardProps = {
    tasks: any[];
    onMove: (task: any, state: TaskState) => void;
    onQuickAdd: (title: string, state: TaskState) => Promise<void>;
    onDelete?: (task: any) => void;
};

// Tableau à trois colonnes : glisser-déposer à la souris, flèches au clavier et sur mobile
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
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
                {TASK_STATES.map((column, index) => {
                    const items = tasks.filter((t) => t.state === column.id);
                    return (
                        <section
                            key={column.id}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (over !== column.id) setOver(column.id);
                            }}
                            onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
                            onDrop={() => drop(column.id)}
                            className={cn(
                                'flex min-h-[420px] w-[85vw] shrink-0 snap-center flex-col rounded-3xl border p-3 transition-colors duration-200 md:w-auto',
                                over === column.id && dragged?.state !== column.id
                                    ? 'border-violet-400/40 bg-violet-500/[0.06]'
                                    : 'border-white/[0.05] bg-white/[0.015]'
                            )}
                        >
                            <header className="flex items-center gap-2 px-2 pb-3 pt-1">
                                <span className={cn('h-2 w-2 rounded-full', column.dot)} />
                                <h3 className="text-sm font-medium text-zinc-200">{column.label}</h3>
                                <motion.span key={items.length} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-xs tabular-nums text-zinc-500">
                                    {items.length}
                                </motion.span>
                            </header>

                            <div className="flex-1 space-y-2">
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
                                            onPrev={index > 0 ? () => onMove(task, TASK_STATES[index - 1].id) : undefined}
                                            onNext={index < TASK_STATES.length - 1 ? () => onMove(task, TASK_STATES[index + 1].id) : undefined}
                                            onDelete={onDelete && (() => onDelete(task))}
                                        />
                                    ))}
                                </AnimatePresence>
                                {items.length === 0 && (
                                    <p className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-8 text-center text-xs text-zinc-600">
                                        {dragged ? 'Déposez ici' : 'Aucune tâche'}
                                    </p>
                                )}
                            </div>

                            <QuickAdd onAdd={(title) => onQuickAdd(title, column.id)} />
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
    onPrev?: () => void;
    onNext?: () => void;
    onDelete?: () => void;
};

const TaskCard = React.forwardRef<HTMLDivElement, CardProps>(function TaskCard({ task, dragging, onDragStart, onDragEnd, onPrev, onNext, onDelete }, ref) {
    const done = task.state === 'done';
    const priority = PRIORITIES[task.priority];

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
                className="group cursor-grab rounded-2xl border border-white/[0.06] bg-zinc-900/70 p-3.5 shadow-card transition-colors hover:border-white/[0.12] active:cursor-grabbing"
            >
                <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-medium leading-snug', done ? 'text-zinc-500 line-through' : 'text-zinc-100')}>{task.title}</p>
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            aria-label="Supprimer la tâche"
                            className="-mr-1 -mt-1 rounded-lg p-1 text-zinc-600 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-300 focus:opacity-100 group-hover:opacity-100"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                {task.description && !done && <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500">{task.description}</p>}

                <div className="mt-3 flex items-center gap-2">
                    {!done && task.priority !== 'low' && priority && <Badge tone={priority.tone}>{priority.label}</Badge>}
                    {task.due_date && (
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.due_date, { day: 'numeric', month: 'short' })}
                        </span>
                    )}
                    <span className="ml-auto flex items-center gap-1">
                        <span className="flex opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                            {onPrev && (
                                <button onClick={onPrev} aria-label="Colonne précédente" className="rounded-md p-1 text-zinc-500 hover:bg-white/[0.06] hover:text-white">
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {onNext && (
                                <button onClick={onNext} aria-label="Colonne suivante" className="rounded-md p-1 text-zinc-500 hover:bg-white/[0.06] hover:text-white">
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </span>
                        {task.assignee_details && <Avatar name={task.assignee_details.full_name} size="sm" />}
                    </span>
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
        if (!title.trim()) return setEditing(false);
        setSaving(true);
        try {
            await onAdd(title.trim());
            setTitle('');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-2">
            {editing ? (
                <motion.form key="form" onSubmit={submit} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                    <input
                        autoFocus
                        value={title}
                        readOnly={saving}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => !title && setEditing(false)}
                        onKeyDown={(e) => e.key === 'Escape' && (setTitle(''), setEditing(false))}
                        placeholder="Titre, puis Entrée"
                        className="w-full rounded-xl border border-violet-400/40 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                    />
                </motion.form>
            ) : (
                <motion.button
                    key="button"
                    onClick={() => setEditing(true)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
                >
                    <Plus className="h-4 w-4" /> Ajouter une tâche
                </motion.button>
            )}
        </div>
    );
}
