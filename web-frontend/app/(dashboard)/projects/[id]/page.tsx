'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, tasksAPI, usersAPI } from '@/lib/api';
import {
    FolderKanban,
    Plus,
    LayoutGrid,
    List,
    Users,
    Calendar,
    ArrowLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    X,
    User as UserIcon,
    ChevronRight,
    MoreVertical,
    Trash2
} from 'lucide-react';

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const projectId = params?.id as string;

    const [project, setProject] = useState<any>(null);
    const [kanbanData, setKanbanData] = useState<{ todo: any[]; in_progress: any[]; done: any[] }>({
        todo: [],
        in_progress: [],
        done: [],
    });
    const [allMembers, setAllMembers] = useState<any[]>([]);
    const [teamUsers, setTeamUsers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'kanban' | 'list' | 'members'>('kanban');
    const [loading, setLoading] = useState(true);

    // Create Task Modal
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskState, setTaskState] = useState<'todo' | 'in_progress' | 'done'>('todo');
    const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [taskAssignee, setTaskAssignee] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [submittingTask, setSubmittingTask] = useState(false);

    // Add Member Modal
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');

    useEffect(() => {
        if (projectId) {
            loadProjectData();
            loadTeamUsers();
        }
    }, [projectId]);

    const loadProjectData = async () => {
        try {
            const [kanbanRes, membersRes] = await Promise.all([
                projectsAPI.getKanban(projectId),
                projectsAPI.getMembers(projectId),
            ]);
            setProject(kanbanRes.data.project);
            setKanbanData(kanbanRes.data.columns || { todo: [], in_progress: [], done: [] });
            setAllMembers(membersRes.data || []);
        } catch (e) {
            console.error('Error loading project details:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadTeamUsers = async () => {
        try {
            const res = await usersAPI.getAll();
            setTeamUsers(res.data.results || res.data || []);
        } catch (e) {
            console.error('Error loading team users:', e);
        }
    };

    const handleMoveTaskState = async (taskId: number | string, newState: 'todo' | 'in_progress' | 'done') => {
        // Optimistic UI update
        const allTasks = [...kanbanData.todo, ...kanbanData.in_progress, ...kanbanData.done];
        const taskToMove = allTasks.find(t => t.id === taskId);
        if (!taskToMove) return;

        const updatedTask = { ...taskToMove, state: newState };
        setKanbanData({
            todo: kanbanData.todo.filter(t => t.id !== taskId).concat(newState === 'todo' ? [updatedTask] : []),
            in_progress: kanbanData.in_progress.filter(t => t.id !== taskId).concat(newState === 'in_progress' ? [updatedTask] : []),
            done: kanbanData.done.filter(t => t.id !== taskId).concat(newState === 'done' ? [updatedTask] : []),
        });

        try {
            await tasksAPI.updateState(taskId, newState);
        } catch (e) {
            console.error('Failed to update task state:', e);
            loadProjectData(); // rollback
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;

        setSubmittingTask(true);
        try {
            await tasksAPI.create({
                project: projectId,
                title: taskTitle,
                description: taskDescription,
                state: taskState,
                priority: taskPriority,
                assignee: taskAssignee || null,
                due_date: taskDueDate || null,
            });
            setIsCreateTaskOpen(false);
            setTaskTitle('');
            setTaskDescription('');
            setTaskDueDate('');
            loadProjectData();
        } catch (e) {
            console.error('Error creating task:', e);
        } finally {
            setSubmittingTask(false);
        }
    };

    const handleAddMember = async () => {
        if (!selectedUserId) return;
        try {
            await projectsAPI.addMember(projectId, selectedUserId);
            setIsAddMemberOpen(false);
            setSelectedUserId('');
            loadProjectData();
        } catch (e) {
            console.error('Error adding project member:', e);
        }
    };

    const handleRemoveMember = async (userId: number | string) => {
        if (confirm('Voulez-vous retirer ce collaborateur du projet ?')) {
            try {
                await projectsAPI.removeMember(projectId, userId);
                loadProjectData();
            } catch (e) {
                console.error('Error removing project member:', e);
            }
        }
    };

    const handleDeleteTask = async (taskId: number | string) => {
        if (confirm('Supprimer cette tâche ?')) {
            try {
                await tasksAPI.delete(taskId);
                loadProjectData();
            } catch (e) {
                console.error('Error deleting task:', e);
            }
        }
    };

    if (loading || !project) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-16 bg-slate-900/60 rounded-xl border border-slate-800"></div>
                <div className="grid grid-cols-3 gap-6 h-96">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-900/40 rounded-xl border border-slate-800"></div>
                    ))}
                </div>
            </div>
        );
    }

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
        <div className="space-y-6">
            {/* Top Navigation & Project Header */}
            <div>
                <Link
                    href="/projects"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition mb-3"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Retour aux projets</span>
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-white tracking-tight">{project.name}</h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 capitalize">
                                {project.status}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 max-w-2xl">{project.description || 'Aucune description.'}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsCreateTaskOpen(true)}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Nouvelle Tâche</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* View Switcher Tabs (Plane-inspired) */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                    onClick={() => setActiveTab('kanban')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                        activeTab === 'kanban'
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                >
                    <LayoutGrid className="h-4 w-4" />
                    <span>Tableau Kanban</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                        {kanbanData.todo.length + kanbanData.in_progress.length + kanbanData.done.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                        activeTab === 'list'
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                >
                    <List className="h-4 w-4" />
                    <span>Vue Liste</span>
                </button>

                <button
                    onClick={() => setActiveTab('members')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                        activeTab === 'members'
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                >
                    <Users className="h-4 w-4" />
                    <span>Membres du projet</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                        {allMembers.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: KANBAN BOARD */}
            {activeTab === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* COLUMN 1: TO DO */}
                    <div className="flex flex-col bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">À faire</h3>
                                <span className="text-xs text-slate-500 font-semibold">{kanbanData.todo.length}</span>
                            </div>
                            <button
                                onClick={() => { setTaskState('todo'); setIsCreateTaskOpen(true); }}
                                className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {kanbanData.todo.map((task) => (
                                <div
                                    key={task.id}
                                    className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition space-y-3 group shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-xs font-semibold text-slate-100">{task.title}</h4>
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {task.description && (
                                        <p className="text-[11px] text-slate-400 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                                        {priorityBadge(task.priority)}
                                        <button
                                            onClick={() => handleMoveTaskState(task.id, 'in_progress')}
                                            className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                                        >
                                            Commencer →
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {kanbanData.todo.length === 0 && (
                                <div className="p-8 text-center border border-dashed border-slate-800/60 rounded-xl text-slate-500 text-xs">
                                    Aucune tâche à faire.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMN 2: IN PROGRESS */}
                    <div className="flex flex-col bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">En cours</h3>
                                <span className="text-xs text-indigo-400 font-semibold">{kanbanData.in_progress.length}</span>
                            </div>
                            <button
                                onClick={() => { setTaskState('in_progress'); setIsCreateTaskOpen(true); }}
                                className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {kanbanData.in_progress.map((task) => (
                                <div
                                    key={task.id}
                                    className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 hover:border-indigo-500/60 transition space-y-3 group shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-xs font-semibold text-slate-100">{task.title}</h4>
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {task.description && (
                                        <p className="text-[11px] text-slate-400 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                                        {priorityBadge(task.priority)}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleMoveTaskState(task.id, 'todo')}
                                                className="text-[10px] text-slate-400 hover:text-slate-200"
                                            >
                                                ← À faire
                                            </button>
                                            <button
                                                onClick={() => handleMoveTaskState(task.id, 'done')}
                                                className="text-[10px] text-emerald-400 hover:underline font-medium"
                                            >
                                                Terminer ✓
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {kanbanData.in_progress.length === 0 && (
                                <div className="p-8 text-center border border-dashed border-slate-800/60 rounded-xl text-slate-500 text-xs">
                                    Aucune tâche en cours.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMN 3: DONE */}
                    <div className="flex flex-col bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Terminé</h3>
                                <span className="text-xs text-emerald-400 font-semibold">{kanbanData.done.length}</span>
                            </div>
                            <button
                                onClick={() => { setTaskState('done'); setIsCreateTaskOpen(true); }}
                                className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {kanbanData.done.map((task) => (
                                <div
                                    key={task.id}
                                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 hover:border-slate-700 transition space-y-3 group shadow-sm opacity-80 hover:opacity-100"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-xs font-semibold text-slate-300 line-through">{task.title}</h4>
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                                        <span className="text-[10px] text-emerald-400 font-medium">Complétée</span>
                                        <button
                                            onClick={() => handleMoveTaskState(task.id, 'in_progress')}
                                            className="text-[10px] text-slate-400 hover:underline"
                                        >
                                            Rouvrir
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {kanbanData.done.length === 0 && (
                                <div className="p-8 text-center border border-dashed border-slate-800/60 rounded-xl text-slate-500 text-xs">
                                    Aucune tâche terminée.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: LIST VIEW */}
            {activeTab === 'list' && (
                <div className="rounded-2xl bg-slate-900/50 border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[11px]">
                            <tr>
                                <th className="p-3.5">Titre</th>
                                <th className="p-3.5">État</th>
                                <th className="p-3.5">Priorité</th>
                                <th className="p-3.5">Assigné à</th>
                                <th className="p-3.5">Échéance</th>
                                <th className="p-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {[...kanbanData.todo, ...kanbanData.in_progress, ...kanbanData.done].map((task) => (
                                <tr key={task.id} className="hover:bg-slate-800/30 transition">
                                    <td className="p-3.5 font-medium text-white">{task.title}</td>
                                    <td className="p-3.5 capitalize">{task.state}</td>
                                    <td className="p-3.5">{priorityBadge(task.priority)}</td>
                                    <td className="p-3.5 text-slate-400">{task.assignee_details?.full_name || 'Non assigné'}</td>
                                    <td className="p-3.5 text-slate-400">{task.due_date || '—'}</td>
                                    <td className="p-3.5 text-right">
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="p-1 text-slate-500 hover:text-red-400 transition"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB 3: PROJECT MEMBERS */}
            {activeTab === 'members' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white">Membres affectés au projet</h2>
                        {(user?.role === 'admin' || user?.role === 'manager') && (
                            <button
                                onClick={() => setIsAddMemberOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Ajouter un membre</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allMembers.map((member) => (
                            <div
                                key={member.id}
                                className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
                                        {member.user_details?.full_name ? member.user_details.full_name[0] : 'U'}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white">{member.user_details?.full_name}</h4>
                                        <p className="text-[11px] text-slate-500">{member.user_details?.email}</p>
                                    </div>
                                </div>
                                {(user?.role === 'admin' || user?.role === 'manager') && member.user !== project.manager && (
                                    <button
                                        onClick={() => handleRemoveMember(member.user)}
                                        className="text-xs text-red-400 hover:underline"
                                    >
                                        Retirer
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Task Modal */}
            {isCreateTaskOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h2 className="text-sm font-bold text-white">Créer une Tâche</h2>
                            <button
                                onClick={() => setIsCreateTaskOpen(false)}
                                className="p-1 text-slate-500 hover:text-white rounded-md transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-slate-400 font-medium mb-1">Titre de la tâche *</label>
                                <input
                                    type="text"
                                    required
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    placeholder="ex: Rédiger la documentation API"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 font-medium mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={taskDescription}
                                    onChange={(e) => setTaskDescription(e.target.value)}
                                    placeholder="Détails, critères d'acceptation..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">État</label>
                                    <select
                                        value={taskState}
                                        onChange={(e) => setTaskState(e.target.value as any)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="todo">À faire</option>
                                        <option value="in_progress">En cours</option>
                                        <option value="done">Terminé</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Priorité</label>
                                    <select
                                        value={taskPriority}
                                        onChange={(e) => setTaskPriority(e.target.value as any)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="low">Basse</option>
                                        <option value="medium">Moyenne</option>
                                        <option value="high">Haute</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Assigner à</label>
                                    <select
                                        value={taskAssignee}
                                        onChange={(e) => setTaskAssignee(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Non assigné</option>
                                        {teamUsers.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.full_name} ({u.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Date d'échéance</label>
                                    <input
                                        type="date"
                                        value={taskDueDate}
                                        onChange={(e) => setTaskDueDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateTaskOpen(false)}
                                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingTask}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                                >
                                    {submittingTask ? 'Création...' : 'Créer la tâche'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {isAddMemberOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h2 className="text-sm font-bold text-white">Ajouter un collaborateur</h2>
                            <button
                                onClick={() => setIsAddMemberOpen(false)}
                                className="p-1 text-slate-500 hover:text-white rounded-md transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-slate-400 font-medium">Sélectionner un membre de l'équipe</label>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">Choisir un collaborateur</option>
                                {teamUsers
                                    .filter(u => !allMembers.some(m => m.user === u.id))
                                    .map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name} ({u.email})
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                            <button
                                onClick={() => setIsAddMemberOpen(false)}
                                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddMember}
                                disabled={!selectedUserId}
                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50"
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
