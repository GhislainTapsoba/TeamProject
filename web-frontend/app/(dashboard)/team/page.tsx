'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mail, Phone, Search, ShieldCheck, UserMinus, UserPlus, Users } from 'lucide-react';
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
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';

// Chaque rôle est expliqué en une phrase, à l'ajout comme au changement de rôle
const ROLE_OPTIONS = [
    { value: 'employee', label: 'Membre', description: 'Voit les projets et s’occupe de ses tâches.' },
    { value: 'manager', label: 'Manager', description: 'Crée des projets et répartit les tâches.' },
    { value: 'admin', label: 'Administrateur', description: 'Peut tout faire, y compris gérer l’équipe et l’abonnement.' },
];

export default function TeamPage() {
    const { user, tenant } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [roleTarget, setRoleTarget] = useState<any>(null);
    const isAdmin = user?.role === 'admin';

    const load = () =>
        usersAPI
            .getAll()
            .then((res) => setTeam(listOf(res)))
            .catch(() => toast.error("L'équipe n'a pas pu se charger. Vérifiez votre connexion internet."))
            .finally(() => setLoading(false));

    useEffect(() => {
        load();
        // Lien « Inviter quelqu'un » du guide de l'accueil
        if (new URLSearchParams(window.location.search).has('invite')) {
            setInviteOpen(true);
            window.history.replaceState(null, '', '/team');
        }
    }, []);

    const removeMember = async (member: any) => {
        const ok = await confirm({
            title: `Retirer ${member.full_name} de l’équipe ?`,
            message: 'Cette personne ne pourra plus entrer dans votre espace. Ses tâches restent dans les projets. Vous pourrez la rajouter plus tard.',
            confirmLabel: 'Oui, la retirer',
            danger: true,
        });
        if (!ok) return;
        try {
            await usersAPI.remove(member.id);
            setTeam((list) => list.filter((m) => m.id !== member.id));
            toast.success(`${member.full_name} a été retiré de l’équipe.`);
        } catch (err) {
            toast.error(errorMessage(err, "Cette personne n'a pas pu être retirée."));
        }
    };

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
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            ) : visible.length === 0 ? (
                <EmptyState icon={Users} title="Personne ici" text="Aucun membre ne correspond à votre recherche." />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                        {visible.map((m, i) => {
                            const isMe = m.id === user?.id;
                            return (
                                <motion.div
                                    key={m.id}
                                    layout
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0, transition: { ...spring, delay: i * 0.04 } }}
                                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
                                    className="glass flex flex-col rounded-2xl p-5"
                                    data-member={m.email}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar name={m.full_name} size="lg" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-base font-medium text-white">
                                                {m.full_name}
                                                {isMe && <span className="ml-1.5 text-sm font-normal text-zinc-400">(vous)</span>}
                                            </p>
                                            <Badge tone={ROLES[m.role]?.tone} className="mt-1">
                                                {ROLES[m.role]?.label || m.role}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex-1 space-y-1.5 border-t border-white/[0.06] pt-4 text-sm text-zinc-300">
                                        <a href={`mailto:${m.email}`} className="flex items-center gap-2 truncate transition hover:text-brand-300">
                                            <Mail className="h-4 w-4 shrink-0 text-zinc-400" />
                                            {m.email}
                                        </a>
                                        {m.phone && (
                                            <p className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-zinc-400" />
                                                {m.phone}
                                            </p>
                                        )}
                                        <p className="pt-1 text-zinc-400">Arrivé·e le {formatDate(m.date_joined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                    {isAdmin && !isMe && (
                                        <div className="mt-4 flex gap-2">
                                            <Button variant="secondary" size="sm" icon={ShieldCheck} className="flex-1" onClick={() => setRoleTarget(m)}>
                                                Changer le rôle
                                            </Button>
                                            <Button variant="ghost" size="sm" icon={UserMinus} onClick={() => removeMember(m)}>
                                                Retirer
                                            </Button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
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
            <RoleModal
                member={roleTarget}
                onClose={() => setRoleTarget(null)}
                onSaved={(id, role) => setTeam((list) => list.map((m) => (m.id === id ? { ...m, role } : m)))}
            />
        </Page>
    );
}

function RoleModal({ member, onClose, onSaved }: { member: any; onClose: () => void; onSaved: (id: number, role: string) => void }) {
    const toast = useToast();
    const [role, setRole] = useState('employee');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (member) setRole(member.role);
    }, [member]);

    const submit = async () => {
        setSaving(true);
        try {
            await usersAPI.setRole(member.id, role);
            onSaved(member.id, role);
            toast.success(`${member.full_name} est maintenant ${ROLES[role]?.label.toLowerCase()}.`);
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, "Le rôle n'a pas pu être changé."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={!!member} onClose={onClose} title={`Rôle de ${member?.full_name ?? ''}`} description="Choisissez ce que cette personne pourra faire.">
            <Choice label="Rôle" columns={1} value={role} onChange={setRole} options={ROLE_OPTIONS} />
            <ModalActions>
                <Button type="button" variant="secondary" size="lg" onClick={onClose}>
                    Annuler
                </Button>
                <Button size="lg" loading={saving} disabled={role === member?.role} onClick={submit}>
                    Enregistrer
                </Button>
            </ModalActions>
        </Modal>
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
                <Choice label="Que pourra-t-elle faire ?" columns={1} value={form.role} onChange={(role) => setForm({ ...form, role })} options={ROLE_OPTIONS} />
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
