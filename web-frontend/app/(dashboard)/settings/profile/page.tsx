'use client';

import React, { useState } from 'react';
import { KeyRound, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api';
import { ROLES } from '@/lib/labels';
import { errorMessage } from '@/lib/utils';
import { Avatar, Badge, Card, Page, PageHeader } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

export default function ProfilePage() {
    const { user, refreshProfile } = useAuth();
    const toast = useToast();

    const [profile, setProfile] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone: user?.phone || '' });
    const [savingProfile, setSavingProfile] = useState(false);
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
    const [savingPassword, setSavingPassword] = useState(false);

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            await authAPI.updateProfile(profile);
            await refreshProfile();
            toast.success('Profil enregistré.');
        } catch (err) {
            toast.error(errorMessage(err, "Le profil n'a pas pu être enregistré."));
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            toast.error('Les deux mots de passe ne correspondent pas.');
            return;
        }
        setSavingPassword(true);
        try {
            await authAPI.changePassword({ old_password: passwords.old, new_password: passwords.new });
            setPasswords({ old: '', new: '', confirm: '' });
            toast.success('Mot de passe modifié.');
        } catch (err) {
            toast.error(errorMessage(err, "Le mot de passe n'a pas pu être modifié."));
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <Page className="max-w-3xl">
            <PageHeader title="Mon profil" subtitle="Votre nom, votre téléphone et votre mot de passe." />

            <Card className="flex items-center gap-4 p-6">
                <Avatar name={user?.full_name} size="lg" />
                <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">{user?.full_name}</p>
                    <p className="truncate text-sm text-zinc-400">{user?.email}</p>
                </div>
                {user && (
                    <Badge tone={ROLES[user.role]?.tone} className="ml-auto">
                        {ROLES[user.role]?.label}
                    </Badge>
                )}
            </Card>

            <Card className="p-6">
                <h2 className="flex items-center gap-2 font-semibold text-white">
                    <UserCircle className="h-4 w-4 text-brand-300" /> Informations
                </h2>
                <form onSubmit={saveProfile} className="mt-5 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input label="Prénom" value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
                        <Input label="Nom" value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
                    </div>
                    <Input label="Téléphone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                    <div className="flex justify-end">
                        <Button type="submit" loading={savingProfile}>
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </Card>

            <Card className="p-6">
                <h2 className="flex items-center gap-2 font-semibold text-white">
                    <KeyRound className="h-4 w-4 text-brand-300" /> Mot de passe
                </h2>
                <form onSubmit={savePassword} className="mt-5 space-y-4">
                    <PasswordInput label="Mot de passe actuel" required value={passwords.old} onChange={(e) => setPasswords({ ...passwords, old: e.target.value })} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <PasswordInput
                            label="Nouveau mot de passe"
                            required
                            minLength={8}
                            value={passwords.new}
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        />
                        <PasswordInput
                            label="Retapez le nouveau mot de passe"
                            required
                            minLength={8}
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" variant="secondary" loading={savingPassword}>
                            Changer le mot de passe
                        </Button>
                    </div>
                </form>
            </Card>
        </Page>
    );
}
