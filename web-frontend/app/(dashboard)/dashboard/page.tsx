'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, CheckCircle2, Clock, FolderKanban, Plus, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { coreAPI, projectsAPI, tasksAPI } from '@/lib/api';
import { listOf } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';
import { AnimatedNumber, Badge, Card, EmptyState, Page, Progress, Segmented, Skeleton } from '@/components/ui/kit';
import { ButtonLink } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import TaskRow from '@/components/TaskRow';
import { PROJECT_STATUSES } from '@/lib/labels';

type Filter = 'open' | 'done' | 'all';

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
            .catch(() => toast.error("Impossible de charger l'accueil."))
            .finally(() => setLoading(false));
    }, []);

    const toggleTask = async (task: any) => {
        const state = task.state === 'done' ? 'todo' : 'done';
        setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, state } : t)));
        try {
            await tasksAPI.updateState(task.id, state);
            if (state === 'done') toast.success('Tâche terminée. Bravo !');
            loadStats().catch(() => {});
        } catch {
            setTasks((list) => list.map((t) => (t.id === task.id ? task : t)));
            toast.error("La tâche n'a pas pu être mise à jour.");
        }
    };

    const open = tasks.filter((t) => t.state !== 'done');
    const visible = filter === 'all' ? tasks : filter === 'done' ? tasks.filter((t) => t.state === 'done') : open;
    const canCreate = user?.role === 'admin' || user?.role === 'manager';
    const hour = new Date().getHours();
    const greeting = hour < 5 || hour >= 18 ? 'Bonsoir' : 'Bonjour';

    const kpis = [
        { label: 'Projets actifs', value: stats?.active_projects, sub: `sur ${stats?.total_projects ?? 0}`, icon: FolderKanban, iconClass: 'text-violet-300', glow: 'from-violet-500/20' },
        { label: 'Mes tâches ouvertes', value: stats?.my_pending_tasks, sub: 'à traiter', icon: Clock, iconClass: 'text-amber-300', glow: 'from-amber-500/20' },
        { label: 'Tâches terminées', value: stats?.completed_tasks, sub: `sur ${stats?.total_tasks ?? 0}`, icon: CheckCircle2, iconClass: 'text-emerald-300', glow: 'from-emerald-500/20' },
        { label: 'Avancement global', value: stats?.completion_rate, suffix: '%', sub: 'des tâches', icon: TrendingUp, iconClass: 'text-sky-300', glow: 'from-sky-500/20' },
    ];

    return (
        <Page>
            <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm text-zinc-500 first-letter:uppercase">
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                        <span className="text-gradient">
                            {greeting}, {user?.first_name || user?.full_name}
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        {loading
                            ? 'Chargement de votre journée…'
                            : open.length === 0
                              ? `Rien en attente chez ${tenant?.name}. Profitez-en.`
                              : `Vous avez ${open.length} tâche${open.length > 1 ? 's' : ''} en cours chez ${tenant?.name}.`}
                    </p>
                </div>
                {canCreate && (
                    <ButtonLink href="/projects?new=1" icon={Plus}>
                        Nouveau projet
                    </ButtonLink>
                )}
            </motion.div>

            <motion.div variants={{ show: { transition: { staggerChildren: 0.07 } } }} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                {kpis.map((k) => (
                    <Card key={k.label} className="relative overflow-hidden p-5">
                        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${k.glow} to-transparent blur-2xl`} />
                        <k.icon className={`relative h-5 w-5 ${k.iconClass}`} />
                        <div className="relative mt-4 text-3xl font-semibold tracking-tight text-white">
                            {loading ? <Skeleton className="h-9 w-14" /> : <AnimatedNumber value={k.value || 0} suffix={k.suffix} />}
                        </div>
                        <p className="relative mt-1 text-[13px] text-zinc-400">{k.label}</p>
                        <p className="relative text-xs text-zinc-600">{k.sub}</p>
                    </Card>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <motion.section variants={fadeUp} className="space-y-4 lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold tracking-tight text-white">Mes tâches</h2>
                        <Segmented
                            id="my-tasks"
                            value={filter}
                            onChange={setFilter}
                            options={[
                                { id: 'open', label: 'À faire', count: open.length },
                                { id: 'done', label: 'Terminées', count: tasks.length - open.length },
                                { id: 'all', label: 'Toutes' },
                            ]}
                        />
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {[0, 1, 2].map((i) => (
                                <Skeleton key={i} className="h-[68px]" />
                            ))}
                        </div>
                    ) : visible.length === 0 ? (
                        <EmptyState
                            icon={CheckCircle2}
                            title={filter === 'done' ? 'Aucune tâche terminée' : 'Tout est fait !'}
                            text={filter === 'done' ? 'Vos tâches terminées apparaîtront ici.' : 'Aucune tâche ne vous est assignée pour le moment.'}
                        />
                    ) : (
                        <div className="space-y-2">
                            <AnimatePresence mode="popLayout" initial={false}>
                                {visible.map((task) => (
                                    <TaskRow key={task.id} task={task} onToggle={toggleTask} />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.section>

                <motion.section variants={fadeUp} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold tracking-tight text-white">Projets récents</h2>
                        <Link href="/projects" className="flex items-center gap-1 text-sm text-zinc-400 transition hover:text-white">
                            Tout voir <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    {loading ? (
                        <Skeleton className="h-64" />
                    ) : projects.length === 0 ? (
                        <EmptyState icon={FolderKanban} title="Aucun projet" text="Créez un projet pour commencer." />
                    ) : (
                        <div className="space-y-3">
                            {projects.map((p, i) => (
                                <motion.div key={p.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                                    <Link
                                        href={`/projects/${p.id}`}
                                        className="glass group block rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-white/[0.14]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="truncate font-medium text-zinc-100 transition group-hover:text-white">{p.name}</p>
                                            <Badge tone={PROJECT_STATUSES[p.status]?.tone}>{PROJECT_STATUSES[p.status]?.label || p.status}</Badge>
                                        </div>
                                        <div className="mt-4 flex items-center gap-3">
                                            <Progress value={p.progress_percentage || 0} />
                                            <span className="text-xs tabular-nums text-zinc-500">{p.progress_percentage || 0}%</span>
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
