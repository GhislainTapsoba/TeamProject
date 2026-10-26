'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, UserMinus, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, tasksAPI, usersAPI } from '@/lib/api';
import { NEXT_STEP, PROJECT_STATUSES, TASK_STATES, type TaskState } from '@/lib/labels';
import { errorMessage, listOf } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';
import { Avatar, Badge, Page, Progress, Skeleton } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';
import { Choice, DateChoice } from '@/components/ui/choice';
import { Modal, ModalActions } from '@/components/ui/modal';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';
import KanbanBoard from '@/components/KanbanBoard';

export default function ProjectPage() {
    const projectId = useParams()?.id as string;
    const { user } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
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
            toast.error("Le projet n'a pas pu se charger. Vérifiez votre connexion internet.");
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
            // Message du bouton « étape suivante », ou nom de la colonne après un glisser-déposer
            const step = NEXT_STEP[task.state as TaskState];
            toast.success(step.to === state ? step.done : `Tâche déplacée dans « ${TASK_STATES.find((s) => s.id === state)?.label} ».`);
        } catch (err) {
            setTasks((list) => list.map((t) => (t.id === task.id ? task : t)));
            toast.error(errorMessage(err, "Seule la personne chargée de cette tâche, ou un responsable, peut la changer."));
        }
    };

    const createTask = async (data: any) => {
        try {
            const res = await tasksAPI.create({ project: projectId, ...data });
            setTasks((list) => [...list, res.data]);
            toast.success('Tâche ajoutée.');
        } catch (err) {
            toast.error(errorMessage(err, "La tâche n'a pas pu être ajoutée."));
            throw err;
        }
    };

    const deleteTask = async (task: any) => {
        const ok = await confirm({
            title: 'Supprimer cette tâche ?',
            message: `« ${task.title} » sera effacée définitivement.`,
            confirmLabel: 'Oui, supprimer',
            danger: true,
        });
        if (!ok) return;
        setTasks((list) => list.filter((t) => t.id !== task.id));
        try {
            await tasksAPI.delete(task.id);
            toast.success('Tâche supprimée.');
        } catch (err) {
            setTasks((list) => [...list, task]);
            toast.error(errorMessage(err, "La tâche n'a pas pu être supprimée."));
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
                <Link href="/projects" className="inline-flex items-center gap-2 rounded-lg py-1 text-[15px] font-medium text-zinc-300 transition hover:text-white">
                    <ArrowLeft className="h-5 w-5" /> Retour aux projets
                </Link>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{project.name}</h1>
                            <Badge tone={PROJECT_STATUSES[project.status]?.tone}>{PROJECT_STATUSES[project.status]?.label || project.status}</Badge>
                        </div>
                        {project.description && <p className="max-w-2xl text-base text-zinc-300">{project.description}</p>}
                        <div className="flex max-w-md items-center gap-3 pt-1">
                            <Progress value={progress} />
                            <span className="whitespace-nowrap text-sm tabular-nums text-zinc-300">
                                {doneCount} terminée{doneCount > 1 ? 's' : ''} sur {tasks.length}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="secondary" icon={Users} onClick={() => setMembersModal(true)}>
                            Membres ({members.length})
                        </Button>
                        <Button icon={Plus} onClick={() => setTaskModal(true)}>
                            Nouvelle tâche
                        </Button>
                    </div>
                </div>

                <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[15px] text-zinc-300">
                    Quand vous vous mettez sur une tâche, appuyez sur <strong className="text-white">Commencer</strong>. Une fois finie, appuyez sur{' '}
                    <strong className="text-white">J&apos;ai terminé</strong>.
                </p>
            </motion.div>

            <motion.div variants={fadeUp}>
                <KanbanBoard
                    tasks={tasks}
                    onMove={moveTask}
                    onQuickAdd={(title, state) => createTask({ title, state, priority: 'medium' })}
                    onDelete={canManage ? deleteTask : undefined}
                />
            </motion.div>

            <TaskModal open={taskModal} onClose={() => setTaskModal(false)} team={team} me={user?.id} onCreate={createTask} />
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

type TaskModalProps = { open: boolean; onClose: () => void; team: any[]; me?: number | string; onCreate: (data: any) => Promise<void> };

function TaskModal({ open, onClose, team, me, onCreate }: TaskModalProps) {
    const empty = { title: '', description: '', priority: 'medium', assignee: '', due_date: '' };
    const [form, setForm] = useState(empty);
    const [details, setDetails] = useState(false);
    const [saving, setSaving] = useState(false);
    const set = (key: keyof typeof empty) => (value: string) => setForm({ ...form, [key]: value });

    // « Moi » en premier : c'est le choix le plus courant
    const people = [
        { value: '', label: 'Personne pour le moment' },
        ...team
            .slice()
            .sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : 0))
            .map((u) => ({ value: String(u.id), label: u.id === me ? 'Moi' : u.full_name, icon: <Avatar name={u.full_name} size="sm" /> })),
    ];

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onCreate({ ...form, state: 'todo', assignee: form.assignee || null, due_date: form.due_date || null });
            setForm(empty);
            setDetails(false);
            onClose();
        } catch {
            // l'erreur est déjà affichée
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Nouvelle tâche" description="Seul le titre est obligatoire.">
            <form onSubmit={submit} className="space-y-6">
                <Input label="Que faut-il faire ?" required autoFocus value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Ex. : Appeler le fournisseur" />
                {details ? (
                    <Textarea label="Détails" value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="Ce qu'il faut savoir pour la faire" />
                ) : (
                    <button type="button" onClick={() => setDetails(true)} className="-mt-2 text-[15px] font-medium text-violet-300 hover:text-violet-200">
                        + Ajouter des détails
                    </button>
                )}
                <Choice label="Qui s'en occupe ?" columns={2} value={form.assignee} onChange={set('assignee')} options={people} />
                <DateChoice label="À finir pour quand ?" value={form.due_date} onChange={set('due_date')} />
                <Choice
                    label="Est-ce urgent ?"
                    value={form.priority}
                    onChange={set('priority')}
                    options={[
                        { value: 'low', label: 'Pas pressé' },
                        { value: 'medium', label: 'Normal' },
                        { value: 'high', label: 'Urgent', activeClass: 'border-rose-400/70 bg-rose-500/15 text-white' },
                    ]}
                />
                <ModalActions>
                    <Button type="button" variant="secondary" size="lg" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button type="submit" size="lg" loading={saving}>
                        Ajouter la tâche
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
    const confirm = useConfirm();
    const candidates = team.filter((u) => !members.some((m) => m.user === u.id));

    const run = async (action: Promise<any>, success: string) => {
        try {
            await action;
            await onChange();
            toast.success(success);
        } catch (err) {
            toast.error(errorMessage(err, "Ça n'a pas marché. Réessayez dans un instant."));
        }
    };

    const remove = async (member: any) => {
        const ok = await confirm({
            title: `Retirer ${member.user_details?.full_name} du projet ?`,
            message: 'Cette personne ne verra plus ce projet. Ses tâches restent en place.',
            confirmLabel: 'Oui, retirer',
            danger: true,
        });
        if (ok) run(projectsAPI.removeMember(projectId, member.user), `${member.user_details?.full_name} a été retiré du projet.`);
    };

    const row = (key: React.Key, name: string, email: string, action: React.ReactNode) => (
        <motion.div key={key} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
            <Avatar name={name} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-white">{name}</p>
                <p className="truncate text-sm text-zinc-400">{email}</p>
            </div>
            {action}
        </motion.div>
    );

    return (
        <Modal open={open} onClose={onClose} title="Membres du projet" description="Les membres voient le projet et peuvent recevoir des tâches.">
            <div className="space-y-1">
                {members.length === 0 && <p className="py-4 text-center text-[15px] text-zinc-400">Personne pour l&apos;instant.</p>}
                {members.map((m) =>
                    row(
                        m.id,
                        m.user_details?.full_name,
                        m.user_details?.email,
                        m.user === managerId ? (
                            <Badge tone="accent">Responsable</Badge>
                        ) : (
                            canManage && (
                                <Button variant="ghost" size="sm" icon={UserMinus} onClick={() => remove(m)}>
                                    Retirer
                                </Button>
                            )
                        )
                    )
                )}
            </div>

            {canManage && candidates.length > 0 && (
                <div className="mt-6 border-t border-white/[0.08] pt-5">
                    <p className="mb-2 text-sm font-medium text-zinc-200">Ajouter au projet</p>
                    {candidates.map((u) =>
                        row(
                            u.id,
                            u.full_name,
                            u.email,
                            <Button size="sm" icon={UserPlus} onClick={() => run(projectsAPI.addMember(projectId, u.id), `${u.full_name} a été ajouté au projet.`)}>
                                Ajouter
                            </Button>
                        )
                    )}
                </div>
            )}

            <ModalActions>
                <Button variant="secondary" onClick={onClose}>
                    Fermer
                </Button>
            </ModalActions>
        </Modal>
    );
}
