'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, FolderKanban, Plus, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI } from '@/lib/api';
import { PROJECT_STATUSES } from '@/lib/labels';
import { errorMessage, formatDate, listOf } from '@/lib/utils';
import { spring } from '@/lib/motion';
import { Avatar, Badge, EmptyState, Page, PageHeader, Progress, Segmented, Skeleton } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';
import { DateChoice } from '@/components/ui/choice';
import { Modal, ModalActions } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

type Filter = 'active' | 'completed' | 'all';

export default function ProjectsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const toast = useToast();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('active');
    const [createOpen, setCreateOpen] = useState(false);
    const canCreate = user?.role === 'admin' || user?.role === 'manager';

    useEffect(() => {
        projectsAPI
            .getAll()
            .then((res) => setProjects(listOf(res)))
            .catch(() => toast.error("Les projets n'ont pas pu se charger. Vérifiez votre connexion internet."))
            .finally(() => setLoading(false));
        // Lien « Nouveau projet » de l'accueil
        if (new URLSearchParams(window.location.search).has('new')) {
            setCreateOpen(true);
            window.history.replaceState(null, '', '/projects');
        }
    }, []);

    const isActive = (p: any) => p.status !== 'completed' && p.status !== 'cancelled';
    const query = search.trim().toLowerCase();
    const visible = projects.filter(
        (p) =>
            (filter === 'all' || (filter === 'active' ? isActive(p) : !isActive(p))) &&
            (!query || p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query))
    );

    return (
        <Page>
            <PageHeader
                title="Projets"
                subtitle="Un projet regroupe les tâches d’un même travail. Ouvrez-en un pour voir ses tâches."
                action={
                    canCreate && (
                        <Button icon={Plus} onClick={() => setCreateOpen(true)}>
                            Nouveau projet
                        </Button>
                    )
                }
            />

            <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input icon={Search} placeholder="Rechercher un projet…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-80" />
                <Segmented
                    id="projects"
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { id: 'active', label: 'En cours', count: projects.filter(isActive).length },
                        { id: 'completed', label: 'Terminés' },
                        { id: 'all', label: 'Tous' },
                    ]}
                />
            </motion.div>

            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-52" />
                    ))}
                </div>
            ) : visible.length === 0 ? (
                <EmptyState
                    icon={FolderKanban}
                    title={projects.length === 0 ? 'Aucun projet pour le moment' : 'Aucun résultat'}
                    text={projects.length === 0 ? 'Un projet regroupe les tâches de votre équipe sur un tableau.' : 'Essayez une autre recherche ou un autre filtre.'}
                    action={
                        canCreate &&
                        projects.length === 0 && (
                            <Button icon={Plus} onClick={() => setCreateOpen(true)}>
                                Créer mon premier projet
                            </Button>
                        )
                    }
                />
            ) : (
                <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                        {visible.map((p, i) => (
                            <motion.div
                                key={p.id}
                                layout
                                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1, transition: { ...spring, delay: i * 0.04 } }}
                                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                                whileHover={{ y: -4 }}
                            >
                                <Link
                                    href={`/projects/${p.id}`}
                                    className="glass group relative flex h-full flex-col overflow-hidden rounded-2xl p-5 transition-colors hover:border-brand-300"
                                >
                                    <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="font-semibold tracking-tight text-ink">{p.name}</h3>
                                        <Badge tone={PROJECT_STATUSES[p.status]?.tone}>{PROJECT_STATUSES[p.status]?.label || p.status}</Badge>
                                    </div>
                                    <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-soft">{p.description || 'Pas de description.'}</p>
                                    <div className="mt-5 flex items-center gap-3">
                                        <Progress value={p.progress_percentage || 0} />
                                        <span className="text-xs tabular-nums text-ink-soft">{p.progress_percentage || 0}%</span>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs text-ink-soft">
                                        <span className="flex items-center gap-2">
                                            <Avatar name={p.manager_details?.full_name} size="sm" />
                                            <span className="truncate">{p.manager_details?.full_name}</span>
                                        </span>
                                        {p.due_date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatDate(p.due_date, { day: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            <CreateProjectModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={(project) => {
                    toast.success('Projet créé.');
                    router.push(`/projects/${project.id}`);
                }}
            />
        </Page>
    );
}

function CreateProjectModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (project: any) => void }) {
    const toast = useToast();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await projectsAPI.create({ name, description, status: 'in_progress', due_date: dueDate || null });
            onCreated(res.data);
        } catch (err) {
            toast.error(errorMessage(err, 'Impossible de créer le projet.'));
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Nouveau projet" description="Vous ajouterez les tâches et les membres juste après.">
            <form onSubmit={submit} className="space-y-6">
                <Input label="Nom du projet" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Ouverture de la boutique" />
                <Textarea label="En quelques mots (facultatif)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Le but du projet" />
                <DateChoice label="À finir pour quand ?" value={dueDate} onChange={setDueDate} />
                <ModalActions>
                    <Button type="button" variant="secondary" size="lg" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button type="submit" size="lg" loading={saving}>
                        Créer le projet
                    </Button>
                </ModalActions>
            </form>
        </Modal>
    );
}
