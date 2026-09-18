'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { tasksAPI } from '@/lib/api';
import {
    CheckSquare,
    CheckCircle2,
    Clock,
    Calendar,
    Search,
    FolderKanban,
    AlertCircle
} from 'lucide-react';

export default function MyTasksPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterState, setFilterState] = useState<string>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const res = await tasksAPI.getAll({ my_tasks: true });
            setTasks(res.data.results || res.data || []);
        } catch (e) {
            console.error('Error loading my tasks:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleState = async (taskId: number | string, currentState: string) => {
        const nextState = currentState === 'done' ? 'todo' : 'done';
        try {
            await tasksAPI.updateState(taskId, nextState as any);
            setTasks(tasks.map(t => t.id === taskId ? { ...t, state: nextState } : t));
        } catch (e) {
            console.error('Error updating task state:', e);
        }
    };

    const filteredTasks = tasks.filter((t) => {
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
            (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase()));
        const matchesState = filterState === 'all' || t.state === filterState;
        return matchesSearch && matchesState;
    });

    const priorityBadge = (priority: string) => {
        if (priority === 'high') {
            return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/20">Haute</span>;
        }
        if (priority === 'medium') {
            return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">Moyenne</span>;
        }
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">Basse</span>;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Mes Tâches</h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Vue centralisée de toutes les tâches qui vous sont actuellement assignées.
                    </p>
                </div>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher une tâche ou un projet..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                    {[
                        { id: 'all', label: 'Toutes' },
                        { id: 'todo', label: 'À faire' },
                        { id: 'in_progress', label: 'En cours' },
                        { id: 'done', label: 'Terminées' },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilterState(f.id)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                                filterState === f.id
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tasks List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-900/40 border border-slate-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : filteredTasks.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900/20 border border-slate-800/80">
                    <CheckSquare className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-300">Aucune tâche trouvée</p>
                    <p className="text-xs text-slate-500 mt-1">Vous n'avez aucune tâche assignée dans ce filtre.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredTasks.map((task) => (
                        <div
                            key={task.id}
                            className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-4 transition group"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <button
                                    onClick={() => handleToggleState(task.id, task.state)}
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
                                    <h3 className={`text-xs font-medium truncate ${task.state === 'done' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                                        {task.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Link
                                            href={`/projects/${task.project}`}
                                            className="text-[11px] text-indigo-400 hover:underline font-medium flex items-center gap-1"
                                        >
                                            <FolderKanban className="h-3 w-3" />
                                            <span>{task.project_name}</span>
                                        </Link>
                                        {task.due_date && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Calendar className="h-2.5 w-2.5" />
                                                {new Date(task.due_date).toLocaleDateString('fr-FR')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                                {priorityBadge(task.priority)}
                                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                                    {task.state === 'todo' ? 'À faire' : task.state === 'in_progress' ? 'En cours' : 'Terminé'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
