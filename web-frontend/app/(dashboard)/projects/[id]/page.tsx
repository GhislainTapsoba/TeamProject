'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, tasksAPI, usersAPI } from '@/lib/api';
import { PROJECT_STATUSES, type TaskState } from '@/lib/labels';
import { errorMessage, listOf } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';
import { Avatar, Badge, Page, Progress, Skeleton } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/field';
import { Modal, ModalActions } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import KanbanBoard from '@/components/KanbanBoard';

export default function ProjectPage() {
    const projectId = useParams()?.id as string;
    const { user } = useAuth();
    const toast = useToast();
    const [project, setProject] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [team, setTeam] = useState<any[]>([]);
    const [taskModal, setTaskModal] = useState(false);
    const [membersModal, setMembersModal] = useState(false);
    const canManage = user?.role === 'admin' || user?.role === 'manager';

    const load = async () => {
        try {
            const [kanbanRes, membersRes] = await Promise.all([projectsAPI.getKanban(projectId), projectsAPI.getMembers(projectId)]);
            const { todo = [], in_progress = [], done = [] } = kanbanRes.data.columns || {};
            setProject(kanbanRes.data.project);
            setTasks([...todo, ...in_progress, ...done]);
            setMembers(membersRes.data || []);
        } catch {
            toast.error('Impossible de charger le projet.');
        }
    };

    useEffect(() => {
        load();
        usersAPI
            .getAll()
            .then((res) => setTeam(listOf(res)))
            .catch(() => {});
    }, [projectId]);

    const moveTask = async (task: any, state: TaskState) => {
        setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, state } : t)));
        try {
            await tasksAPI.updateState(task.id, state);
        } catch (err) {
            setTasks((list) => list.map((t) => (t.id === task.id ? task : t)));
            toast.error(errorMessage(err, "Vous ne pouvez pas déplacer cette tâche."));
        }
    };

    const createTask = async (data: any) => {
        try {
            const res = await tasksAPI.create({ project: projectId, ...data });
            setTasks((list) => [...list, res.data]);
        } catch (err) {
            toast.error(errorMessage(err, 'Impossible de créer la tâche.'));
            throw err;
        }
    };

    const deleteTask = async (task: any) => {
        if (!confirm(`Supprimer « ${task.title} » ?`)) return;
        setTasks((list) => list.filter((t) => t.id !== task.id));
        try {
            await tasksAPI.delete(task.id);
        } catch (err) {
            setTasks((list) => [...list, task]);
            toast.error(errorMessage(err, 'Impossible de supprimer la tâche.'));
        }
    };

    if (!project) {
        return (
            <div className="mx-auto max-w-6xl space-y-6">
                <Skeleton className="h-32" />
                <div className="grid gap-4 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-96" />
                    ))}
                </div>
            </div>
        );
    }

    const doneCount = tasks.filter((t) => t.state === 'done').length;
    const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

    return (
        <Page>
            <motion.div variants={fadeUp} className="space-y-5">
                <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-white">
                    <ArrowLeft className="h-4 w-4" /> Projets
                </Link>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{project.name}</h1>
                            <Badge tone={PROJECT_STATUSES[project.status]?.tone}>{PROJECT_STATUSES[project.status]?.label || project.status}</Badge>
                        </div>
                        {project.description && <p className="max-w-2xl text-sm text-zinc-400">{project.description}</p>}
                        <div className="flex max-w-sm items-center gap-3 pt-1">
                            <Progress value={progress} />
                            <span className="whitespace-nowrap text-xs tabular-nums text-zinc-400">
                                {doneCount}/{tasks.length} terminées
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMembersModal(true)}
                            className="flex items-center rounded-xl py-1 pl-1 pr-3 transition hover:bg-white/[0.05]"
                            title="Membres du projet"
                        >
                            <span className="flex -space-x-2">
                                {members.slice(0, 4).map((m) => (
                                    <Avatar key={m.id} name={m.user_details?.full_name} size="sm" className="ring-2 ring-canvas" />
                                ))}
                                {members.length === 0 && (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06]">
                                        <Users className="h-3.5 w-3.5 text-zinc-400" />
                                    </span>
                                )}
                            </span>
                            <span className="ml-2 text-sm text-zinc-400">{members.length > 4 ? `+${members.length - 4}` : 'Membres'}</span>
                        </button>
                        <Button icon={Plus} onClick={() => setTaskModal(true)}>
                            Nouvelle tâche
                        </Button>
                    </div>
                </div>
            </motion.div>

            <motion.div variants={fadeUp}>
                <KanbanBoard
                    tasks={tasks}
                    onMove={moveTask}
                    onQuickAdd={(title, state) => createTask({ title, state, priority: 'medium' })}
                    onDelete={canManage ? deleteTask : undefined}
                />
            </motion.div>

            <TaskModal open={taskModal} onClose={() => setTaskModal(false)} team={team} onCreate={createTask} />
            <MembersModal
                open={membersModal}
                onClose={() => setMembersModal(false)}
                projectId={projectId}
                managerId={project.manager}
                members={members}
                team={team}
                canManage={canManage}
                onChange={load}
            />
        </Page>
    );
}

function TaskModal({ open, onClose, team, onCreate }: { open: boolean; onClose: () => void; team: any[]; onCreate: (data: any) => Promise<void> }) {
    const empty = { title: '', description: '', priority: 'medium', assignee: '', due_date: '' };
    const [form, setForm] = useState(empty);
    const [saving, setSaving] = useState(false);
    const set = (key: keyof typeof empty) => (e: React.ChangeEvent<any>) => setForm({ ...form, [key]: e.target.value });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onCreate({ ...form, state: 'todo', assignee: form.assignee || null, due_date: form.due_date || null });
            setForm(empty);
            onClose();
        } catch {
            // l'erreur est déjà affichée
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Nouvelle tâche">
            <form onSubmit={submit} className="space-y-4">
                <Input label="Titre" required autoFocus value={form.title} onChange={set('title')} placeholder="Rédiger le cahier des charges" />
                <Textarea label="Description (facultatif)" value={form.description} onChange={set('description')} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select label="Assignée à" value={form.assignee} onChange={set('assignee')}>
                        <option value="">Personne</option>
                        {team.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.full_name}
                            </option>
                        ))}
                    </Select>
                    <Input label="Échéance" type="date" value={form.due_date} onChange={set('due_date')} />
                </div>
                <Select label="Priorité" value={form.priority} onChange={set('priority')}>
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                </Select>
                <ModalActions>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button type="submit" loading={saving}>
                        Créer la tâche
                    </Button>
                </ModalActions>
            </form>
        </Modal>
    );
}

type MembersModalProps = {
    open: boolean;
    onClose: () => void;
    projectId: string;
    managerId: number;
    members: any[];
    team: any[];
    canManage: boolean;
    onChange: () => Promise<void>;
};

function MembersModal({ open, onClose, projectId, managerId, members, team, canManage, onChange }: MembersModalProps) {
    const toast = useToast();
    const [selected, setSelected] = useState('');
    const candidates = team.filter((u) => !members.some((m) => m.user === u.id));

    const run = async (action: Promise<any>, success: string) => {
        try {
            await action;
            await onChange();
            toast.success(success);
        } catch (err) {
            toast.error(errorMessage(err, 'Action impossible.'));
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Membres du projet" description="Les membres voient le projet et peuvent recevoir des tâches.">
            {canManage && candidates.length > 0 && (
                <div className="mb-5 flex gap-2">
                    <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1">
                        <option value="">Ajouter une personne…</option>
                        {candidates.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.full_name}
                            </option>
                        ))}
                    </Select>
                    <Button
                        icon={UserPlus}
                        disabled={!selected}
                        onClick={() => run(projectsAPI.addMember(projectId, selected), 'Membre ajouté.').then(() => setSelected(''))}
                        aria-label="Ajouter"
                        className="h-11"
                    />
                </div>
            )}
            <div className="space-y-1">
                {members.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">Aucun membre pour l&apos;instant.</p>}
                {members.map((m, i) => (
                    <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]"
                    >
                        <Avatar name={m.user_details?.full_name} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-100">{m.user_details?.full_name}</p>
                            <p className="truncate text-xs text-zinc-500">{m.user_details?.email}</p>
                        </div>
                        {m.user === managerId ? (
                            <Badge tone="accent">Responsable</Badge>
                        ) : (
                            canManage && (
                                <button
                                    onClick={() => run(projectsAPI.removeMember(projectId, m.user), 'Membre retiré.')}
                                    aria-label="Retirer du projet"
                                    className="rounded-lg p-2 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )
                        )}
                    </motion.div>
                ))}
            </div>
        </Modal>
    );
}
