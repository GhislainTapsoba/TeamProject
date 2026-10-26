'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mail, Phone, Search, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api';
import { ROLES } from '@/lib/labels';
import { errorMessage, formatDate, listOf } from '@/lib/utils';
import { spring } from '@/lib/motion';
import { Avatar, Badge, EmptyState, Page, PageHeader, Skeleton } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/field';
import { Choice } from '@/components/ui/choice';
import { Modal, ModalActions } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

export default function TeamPage() {
    const { user, tenant } = useAuth();
    const toast = useToast();
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [inviteOpen, setInviteOpen] = useState(false);
    const isAdmin = user?.role === 'admin';

    const load = () =>
        usersAPI
            .getAll()
            .then((res) => setTeam(listOf(res)))
            .catch(() => toast.error("Impossible de charger l'équipe."))
            .finally(() => setLoading(false));

    useEffect(() => {
        load();
        // Lien « Inviter quelqu'un » du guide de l'accueil
        if (new URLSearchParams(window.location.search).has('invite')) {
            setInviteOpen(true);
            window.history.replaceState(null, '', '/team');
        }
    }, []);

    const query = search.trim().toLowerCase();
    const visible = team.filter((m) => !query || m.full_name?.toLowerCase().includes(query) || m.email.toLowerCase().includes(query));

    return (
        <Page>
            <PageHeader
                title="Équipe"
                subtitle={`Les ${team.length} personne${team.length > 1 ? 's' : ''} qui travaillent avec vous chez ${tenant?.name ?? 'votre organisation'}.`}
                action={
                    isAdmin && (
                        <Button icon={UserPlus} onClick={() => setInviteOpen(true)}>
                            Ajouter un membre
                        </Button>
                    )
                }
            />

            {team.length > 6 && (
                <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
                    <Input icon={Search} placeholder="Rechercher par nom ou email…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-80" />
                </motion.div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-40" />
                    ))}
                </div>
            ) : visible.length === 0 ? (
                <EmptyState icon={Users} title="Personne ici" text="Aucun membre ne correspond à votre recherche." />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                        {visible.map((m, i) => (
                            <motion.div
                                key={m.id}
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0, transition: { ...spring, delay: i * 0.04 } }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                whileHover={{ y: -3 }}
                                className="glass rounded-2xl p-5 transition-colors hover:border-white/[0.12]"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="relative">
                                        <Avatar name={m.full_name} size="lg" />
                                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-zinc-950 ${m.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-white">
                                            {m.full_name}
                                            {m.id === user?.id && <span className="ml-1.5 text-xs font-normal text-zinc-400">(vous)</span>}
                                        </p>
                                        <Badge tone={ROLES[m.role]?.tone} className="mt-1">
                                            {ROLES[m.role]?.label || m.role}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-1.5 border-t border-white/[0.05] pt-4 text-sm text-zinc-400">
                                    <a href={`mailto:${m.email}`} className="flex items-center gap-2 truncate transition hover:text-violet-300">
                                        <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                        {m.email}
                                    </a>
                                    {m.phone && (
                                        <p className="flex items-center gap-2">
                                            <Phone className="h-3.5 w-3.5 text-zinc-400" />
                                            {m.phone}
                                        </p>
                                    )}
                                    <p className="pt-1 text-xs text-zinc-400">Arrivé·e le {formatDate(m.date_joined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <InviteModal
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                onInvited={() => {
                    toast.success('Membre ajouté à l’équipe.');
                    load();
                }}
            />
        </Page>
    );
}

function InviteModal({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
    const toast = useToast();
    const empty = { first_name: '', last_name: '', email: '', role: 'employee', phone: '', password: '' };
    const [form, setForm] = useState(empty);
    const [saving, setSaving] = useState(false);
    const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await usersAPI.create({ ...form, username: form.email });
            setForm(empty);
            onClose();
            onInvited();
        } catch (err) {
            toast.error(errorMessage(err, "Impossible d'ajouter ce membre."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Ajouter un membre" description="Donnez-lui ensuite son email et le mot de passe choisi ici : elle pourra se connecter.">
            <form onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Prénom" required autoFocus value={form.first_name} onChange={set('first_name')} />
                    <Input label="Nom" required value={form.last_name} onChange={set('last_name')} />
                </div>
                <Input label="Email" type="email" required value={form.email} onChange={set('email')} placeholder="prenom@entreprise.com" />
                <Input label="Téléphone (facultatif)" type="tel" value={form.phone} onChange={set('phone')} placeholder="+226 70 00 00 00" />
                <Choice
                    label="Que pourra-t-elle faire ?"
                    columns={1}
                    value={form.role}
                    onChange={(role) => setForm({ ...form, role })}
                    options={[
                        { value: 'employee', label: 'Membre', description: 'Voit les projets et s’occupe de ses tâches.' },
                        { value: 'manager', label: 'Manager', description: 'Crée des projets et répartit les tâches.' },
                        { value: 'admin', label: 'Administrateur', description: 'Peut tout faire, y compris gérer l’équipe et l’abonnement.' },
                    ]}
                />
                <PasswordInput
                    label="Mot de passe pour sa première connexion"
                    value={form.password}
                    onChange={set('password')}
                    minLength={8}
                    hint="8 caractères minimum. Inutile si la personne a déjà un compte Team Project."
                />
                <ModalActions>
                    <Button type="button" variant="secondary" size="lg" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button type="submit" size="lg" loading={saving}>
                        Ajouter à l’équipe
                    </Button>
                </ModalActions>
            </form>
        </Modal>
    );
}
