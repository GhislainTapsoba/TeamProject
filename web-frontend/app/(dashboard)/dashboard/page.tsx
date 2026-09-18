'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { coreAPI, projectsAPI, tasksAPI } from '@/lib/api';
import {
    FolderKanban,
    CheckCircle2,
    Clock,
    TrendingUp,
    ArrowUpRight,
    Plus,
    Calendar,
    AlertCircle,
    User as UserIcon
} from 'lucide-react';

export default function DashboardHomePage() {
    const { user, tenant } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [myTasks, setMyTasks] = useState<any[]>([]);
    const [recentProjects, setRecentProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsRes, tasksRes, projectsRes] = await Promise.all([
                coreAPI.getDashboardStats(),
                tasksAPI.getAll({ my_tasks: true }),
                projectsAPI.getAll(),
            ]);
            setStats(statsRes.data);
            setMyTasks(tasksRes.data.results || tasksRes.data || []);
            setRecentProjects((projectsRes.data.results || projectsRes.data || []).slice(0, 4));
        } catch (e) {
            console.error('Error loading dashboard data:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickTaskStatus = async (taskId: number | string, currentState: string) => {
        const nextState = currentState === 'todo' ? 'in_progress' : currentState === 'in_progress' ? 'done' : 'todo';
        try {
            await tasksAPI.updateState(taskId, nextState as any);
            loadData();
        } catch (e) {
            console.error('Error updating task state:', e);
        }
    };

    const todayStr = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-20 bg-slate-900/60 rounded-2xl border border-slate-800"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-28 bg-slate-900/60 rounded-xl border border-slate-800"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Greeting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Bonjour, {user?.first_name || user?.full_name} 👋
                    </h1>
                    <p className="text-xs text-slate-400 capitalize mt-1">
                        {todayStr} • Espace {tenant?.name}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/projects"
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Nouveau Projet</span>
                    </Link>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Projects */}
                <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">Projets Actifs</span>
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <FolderKanban className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{stats?.active_projects || 0}</span>
                        <span className="text-[11px] text-slate-500">sur {stats?.total_projects || 0}</span>
                    </div>
                </div>

                {/* My Tasks Pending */}
                <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">Mes Tâches en cours</span>
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                            <Clock className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{stats?.my_pending_tasks || 0}</span>
                        <span className="text-[11px] text-slate-500">tâches assignées</span>
                    </div>
                </div>

                {/* Completed Tasks */}
                <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">Tâches Terminées</span>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{stats?.completed_tasks || 0}</span>
                        <span className="text-[11px] text-slate-500">sur {stats?.total_tasks || 0} totales</span>
                    </div>
                </div>

                {/* Completion Rate */}
                <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">Taux d'Achèvement</span>
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{stats?.completion_rate || 0}%</span>
                        <span className="text-[11px] text-slate-500">global</span>
                    </div>
                </div>
            </div>

            {/* 2-Column Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2/3): My Tasks */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white tracking-tight">Mes Tâches Assignées</h2>
                        <Link href="/tasks" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                            Voir tout <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {myTasks.length === 0 ? (
                            <div className="p-8 rounded-xl bg-slate-900/30 border border-slate-800/80 text-center">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
                                <p className="text-xs text-slate-400">Vous n'avez aucune tâche en attente !</p>
                            </div>
                        ) : (
                            myTasks.slice(0, 5).map((task) => (
                                <div
                                    key={task.id}
                                    className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/90 hover:border-slate-700 flex items-center justify-between gap-4 transition group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            onClick={() => handleQuickTaskStatus(task.id, task.state)}
                                            className={`h-5 w-5 rounded border flex items-center justify-center transition ${
                                                task.state === 'done'
                                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                                    : task.state === 'in_progress'
                                                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                                                    : 'border-slate-700 hover:border-slate-500'
                                            }`}
                                            title="Changer l'état"
                                        >
                                            {task.state === 'done' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                            {task.state === 'in_progress' && <span className="h-2 w-2 rounded-full bg-indigo-400"></span>}
                                        </button>
                                        <div className="min-w-0">
                                            <p className={`text-xs font-medium truncate ${task.state === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px] text-indigo-400 font-medium">{task.project_name}</span>
                                                {task.due_date && (
                                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <Calendar className="h-2.5 w-2.5" />
                                                        {new Date(task.due_date).toLocaleDateString('fr-FR')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                            task.priority === 'high' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                                            task.priority === 'medium' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                            'bg-slate-800 text-slate-400'
                                        }`}>
                                            {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column (1/3): Recent Projects & Activity */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white tracking-tight">Projets Récents</h2>
                        <Link href="/projects" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                            Tous <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {recentProjects.length === 0 ? (
                            <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-800/80 text-center">
                                <p className="text-xs text-slate-500">Aucun projet créé.</p>
                            </div>
                        ) : (
                            recentProjects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.id}`}
                                    className="block p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/90 hover:border-indigo-500/40 transition group"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition truncate">
                                            {project.name}
                                        </h3>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                                            {project.status}
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                            <span>Progression</span>
                                            <span>{project.progress_percentage || 0}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                                style={{ width: `${project.progress_percentage || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
