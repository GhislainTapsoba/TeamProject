'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI } from '@/lib/api';
import {
    FolderKanban,
    Plus,
    Search,
    Calendar,
    Users,
    CheckCircle2,
    Clock,
    X,
    MoreHorizontal
} from 'lucide-react';

export default function ProjectsListPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Create Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newStatus, setNewStatus] = useState('in_progress');
    const [newDueDate, setNewDueDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const res = await projectsAPI.getAll();
            setProjects(res.data.results || res.data || []);
        } catch (e) {
            console.error('Error loading projects:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setSubmitting(true);
        try {
            await projectsAPI.create({
                name: newName,
                description: newDescription,
                status: newStatus,
                due_date: newDueDate || null,
            });
            setIsCreateOpen(false);
            setNewName('');
            setNewDescription('');
            setNewDueDate('');
            loadProjects();
        } catch (err) {
            console.error('Error creating project:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredProjects = projects.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusBadges: Record<string, { label: string; color: string }> = {
        planning: { label: 'Planification', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        in_progress: { label: 'En cours', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        on_hold: { label: 'En pause', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        completed: { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        cancelled: { label: 'Annulé', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Top Bar with Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Projets</h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Gérez et suivez l'avancement de tous les projets de votre organisation.
                    </p>
                </div>
                {(user?.role === 'admin' || user?.role === 'manager') && (
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Créer un Projet</span>
                    </button>
                )}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher un projet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {['all', 'in_progress', 'planning', 'on_hold', 'completed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                                statusFilter === status
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                            }`}
                        >
                            {status === 'all' ? 'Tous' : statusBadges[status]?.label || status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Projects Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse"></div>
                    ))}
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900/20 border border-slate-800/80">
                    <FolderKanban className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-300">Aucun projet trouvé</p>
                    <p className="text-xs text-slate-500 mt-1">Créez votre premier projet pour commencer à collaborer.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredProjects.map((project) => {
                        const badge = statusBadges[project.status] || { label: project.status, color: 'bg-slate-800 text-slate-400' };
                        return (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="flex flex-col justify-between p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900/70 transition group shadow-sm"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition tracking-tight">
                                            {project.name}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${badge.color}`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                                        {project.description || 'Aucune description fournie.'}
                                    </p>
                                </div>

                                <div className="space-y-3 pt-3 border-t border-slate-800/60">
                                    {/* Progress */}
                                    <div>
                                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                            <span>Progression</span>
                                            <span className="font-semibold text-slate-200">{project.progress_percentage || 0}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                                style={{ width: `${project.progress_percentage || 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Meta info */}
                                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-300">
                                                {project.manager_details?.full_name ? project.manager_details.full_name[0] : 'M'}
                                            </div>
                                            <span className="truncate max-w-[100px]">{project.manager_details?.full_name || 'Chef'}</span>
                                        </div>
                                        {project.due_date && (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{new Date(project.due_date).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Create Project Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h2 className="text-sm font-bold text-white">Nouveau Projet</h2>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="p-1 text-slate-500 hover:text-white rounded-md transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-400 font-medium mb-1">Nom du projet *</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="ex: Refonte SaaS 2.0"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 font-medium mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="Objectifs et périmètre du projet..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Statut initial</label>
                                    <select
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="planning">Planification</option>
                                        <option value="in_progress">En cours</option>
                                        <option value="on_hold">En pause</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Date d'échéance</label>
                                    <input
                                        type="date"
                                        value={newDueDate}
                                        onChange={(e) => setNewDueDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                                    >
                                    </input>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                                >
                                    {submitting ? 'Création...' : 'Créer le projet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
