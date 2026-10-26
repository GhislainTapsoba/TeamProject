'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, CheckCircle2, Clock, FolderKanban, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { coreAPI, projectsAPI, tasksAPI } from '@/lib/api';
import { cn, listOf } from '@/lib/utils';
import { fadeUp, spring } from '@/lib/motion';
import { AnimatedNumber, Badge, Card, EmptyState, Page, Progress, Segmented, Skeleton } from '@/components/ui/kit';
import { ButtonLink } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import TaskRow from '@/components/TaskRow';
import { NEXT_STEP, PROJECT_STATUSES, type TaskState } from '@/lib/labels';

type Filter = 'open' | 'done';

export default function HomePage() {
    const { user, tenant } = useAuth();
    const toast = useToast();
    const [stats, setStats] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [filter, setFilter] = useState<Filter>('open');
    const [loading, setLoading] = useState(true);

    const loadStats = () => coreAPI.getDashboardStats().then((res) => setStats(res.data));

    useEffect(() => {
        Promise.all([loadStats(), tasksAPI.getMine(), projectsAPI.getAll()])
            .then(([, tasksRes, projectsRes]) => {
                setTasks(listOf(tasksRes));
                setProjects(listOf(projectsRes).slice(0, 4));
            })
            .catch(() => toast.error("La page n'a pas pu se charger. Vérifiez votre connexion internet."))
            .finally(() => setLoading(false));
    }, []);

    const stepTask = async (task: any) => {
        const next = NEXT_STEP[task.state as TaskState];
        setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, state: next.to } : t)));
        try {
            await tasksAPI.updateState(task.id, next.to);
            toast.success(next.done);
            loadStats().catch(() => {});
        } catch {
            setTasks((list) => list.map((t) => (t.id === task.id ? task : t)));
            toast.error("Ça n'a pas marché. Réessayez dans un instant.");
        }
    };

    const open = tasks.filter((t) => t.state !== 'done');
    const visible = filter === 'done' ? tasks.filter((t) => t.state === 'done') : open;
    const canCreate = user?.role === 'admin' || user?.role === 'manager';
    const hour = new Date().getHours();
    const greeting = hour < 5 || hour >= 18 ? 'Bonsoir' : 'Bonjour';

    const kpis = [
        { label: 'Tâches à faire pour moi', value: stats?.my_pending_tasks, icon: Clock, iconClass: 'text-amber-300', glow: 'from-amber-500/20' },
        { label: 'Projets en cours', value: stats?.active_projects, icon: FolderKanban, iconClass: 'text-violet-300', glow: 'from-violet-500/20' },
        { label: 'Tâches terminées par l’équipe', value: stats?.completed_tasks, icon: CheckCircle2, iconClass: 'text-emerald-300', glow: 'from-emerald-500/20' },
    ];

    return (
        <Page>
            <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[15px] text-zinc-400 first-letter:uppercase">
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                        <span className="text-gradient">
                            {greeting} {user?.first_name || user?.full_name}
                        </span>
                    </h1>
                    <p className="mt-2 text-base text-zinc-300">
                        {loading
                            ? 'Chargement…'
                            : open.length === 0
                              ? 'Vous n’avez rien à faire pour le moment.'
                              : `Vous avez ${open.length} tâche${open.length > 1 ? 's' : ''} à faire.`}
                    </p>
                </div>
                {canCreate && (
                    <ButtonLink href="/projects?new=1" icon={Plus} size="lg">
                        Créer un projet
                    </ButtonLink>
                )}
            </motion.div>

            {canCreate && stats && <GettingStarted stats={stats} organisation={tenant?.name} />}

            <motion.div variants={{ show: { transition: { staggerChildren: 0.07 } } }} className="hidden gap-3 sm:grid sm:grid-cols-3 lg:gap-4">
                {/* Masqués sur mobile : la phrase d'accueil suffit, les tâches passent devant */}
                {kpis.map((k) => (
                    <Card key={k.label} className="relative overflow-hidden p-5">
                        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${k.glow} to-transparent blur-2xl`} />
                        <k.icon className={`relative h-6 w-6 ${k.iconClass}`} />
                        <div className="relative mt-4">
                            <div className="text-3xl font-semibold tracking-tight text-white">
                                {loading ? <Skeleton className="h-9 w-14" /> : <AnimatedNumber value={k.value || 0} />}
                            </div>
                            <p className="mt-1 text-[15px] text-zinc-300">{k.label}</p>
                        </div>
                    </Card>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <motion.section variants={fadeUp} className="space-y-4 lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold tracking-tight text-white">Mes tâches</h2>
                        <Segmented
                            id="my-tasks"
                            value={filter}
                            onChange={setFilter}
                            options={[
                                { id: 'open', label: 'À faire', count: open.length },
                                { id: 'done', label: 'Terminées', count: tasks.length - open.length },
                            ]}
                        />
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[0, 1, 2].map((i) => (
                                <Skeleton key={i} className="h-28" />
                            ))}
                        </div>
                    ) : visible.length === 0 ? (
                        <EmptyState
                            icon={CheckCircle2}
                            title={filter === 'done' ? 'Aucune tâche terminée pour l’instant' : 'Rien à faire, tout est à jour'}
                            text={
                                filter === 'done'
                                    ? 'Quand vous terminez une tâche, elle apparaît ici.'
                                    : 'Quand quelqu’un vous confie une tâche, elle apparaît ici et vous recevez une notification.'
                            }
                        />
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout" initial={false}>
                                {visible.map((task) => (
                                    <TaskRow key={task.id} task={task} onStep={stepTask} />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.section>

                <motion.section variants={fadeUp} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold tracking-tight text-white">Projets</h2>
                        <Link href="/projects" className="flex items-center gap-1 text-[15px] font-medium text-violet-300 transition hover:text-violet-200">
                            Voir tous les projets <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    {loading ? (
                        <Skeleton className="h-64" />
                    ) : projects.length === 0 ? (
                        <EmptyState icon={FolderKanban} title="Aucun projet" text="Un projet regroupe les tâches d’un même travail." />
                    ) : (
                        <div className="space-y-3">
                            {projects.map((p, i) => (
                                <motion.div key={p.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                                    <Link href={`/projects/${p.id}`} className="glass group block rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-white/[0.16]">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="truncate text-base font-medium text-white">{p.name}</p>
                                            <Badge tone={PROJECT_STATUSES[p.status]?.tone}>{PROJECT_STATUSES[p.status]?.label || p.status}</Badge>
                                        </div>
                                        <div className="mt-4 flex items-center gap-3">
                                            <Progress value={p.progress_percentage || 0} />
                                            <span className="whitespace-nowrap text-sm tabular-nums text-zinc-300">{p.progress_percentage || 0}% fait</span>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.section>
            </div>
        </Page>
    );
}

// Guide des premiers pas : disparaît dès que l'organisation est lancée
function GettingStarted({ stats, organisation }: { stats: any; organisation?: string }) {
    const steps = [
        { done: stats.total_projects > 0, title: 'Créer un premier projet', text: 'Par exemple « Ouverture de la boutique ».', href: '/projects?new=1', action: 'Créer un projet' },
        { done: stats.total_tasks > 0, title: 'Ajouter des tâches', text: 'Ouvrez le projet et écrivez ce qu’il faut faire.', href: '/projects', action: 'Ouvrir mes projets' },
        { done: stats.team_members_count > 1, title: 'Inviter un collègue', text: 'Il pourra voir les projets et recevoir des tâches.', href: '/team?invite=1', action: 'Inviter quelqu’un' },
    ];
    const doneCount = steps.filter((s) => s.done).length;
    if (doneCount === steps.length) return null;
    const current = steps.findIndex((s) => !s.done);

    return (
        <Card className="overflow-hidden p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-white">Pour bien démarrer</h2>
                    <p className="mt-1 text-[15px] text-zinc-300">Trois étapes pour lancer {organisation || 'votre équipe'}.</p>
                </div>
                <span className="text-[15px] font-medium text-zinc-300">
                    {doneCount} sur {steps.length} fait{doneCount > 1 ? 'es' : 'e'}
                </span>
            </div>
            <ol className="mt-6 grid gap-3 md:grid-cols-3">
                {steps.map((s, i) => (
                    <li
                        key={s.title}
                        className={cn('flex flex-col rounded-2xl border p-4', i === current ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/[0.08] bg-white/[0.02]')}
                    >
                        <div className="flex items-center gap-3">
                            <motion.span
                                initial={false}
                                animate={{ scale: s.done ? [1.3, 1] : 1 }}
                                transition={spring}
                                className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold',
                                    s.done ? 'bg-emerald-400 text-zinc-950' : i === current ? 'bg-violet-500 text-white' : 'bg-white/[0.08] text-zinc-300'
                                )}
                            >
                                {s.done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                            </motion.span>
                            <p className={cn('text-base font-medium', s.done ? 'text-zinc-400 line-through' : 'text-white')}>{s.title}</p>
                        </div>
                        <p className="mt-2 flex-1 text-sm text-zinc-300">{s.text}</p>
                        {i === current && (
                            <ButtonLink href={s.href} className="mt-4 w-full">
                                {s.action} <ArrowRight className="h-4 w-4" />
                            </ButtonLink>
                        )}
                    </li>
                ))}
            </ol>
        </Card>
    );
}
