'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api';
import {
    UserCircle,
    KeyRound,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

export default function ProfilePage() {
    const { user, refreshProfile } = useAuth();

    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Password State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileSaving(true);
        setProfileMsg(null);
        try {
            await authAPI.updateProfile({
                first_name: firstName,
                last_name: lastName,
                phone: phone,
            });
            await refreshProfile();
            setProfileMsg({ type: 'success', text: 'Profil mis à jour avec succès.' });
        } catch (err: any) {
            setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Erreur lors de la mise à jour.' });
        } finally {
            setProfileSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMsg(null);

        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' });
            return;
        }

        setPasswordSaving(true);
        try {
            await authAPI.changePassword({
                old_password: oldPassword,
                new_password: newPassword,
            });
            setPasswordMsg({ type: 'success', text: 'Mot de passe modifié avec succès.' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const errorMsg = err.response?.data?.old_password?.[0] || 'Erreur lors du changement de mot de passe.';
            setPasswordMsg({ type: 'error', text: errorMsg });
        } finally {
            setPasswordSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Mon Profil</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                    Modifiez vos informations personnelles et sécurisez votre compte.
                </p>
            </div>

            {/* Profile Info Form */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                    <UserCircle className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white">Informations Personnelles</h2>
                </div>

                {profileMsg && (
                    <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                        profileMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {profileMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                        <span>{profileMsg.text}</span>
                    </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 font-medium mb-1">Prénom</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 font-medium mb-1">Nom</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 font-medium mb-1">Email</label>
                            <input
                                type="email"
                                disabled
                                value={user?.email || ''}
                                className="w-full bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5 text-slate-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 font-medium mb-1">Téléphone</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={profileSaving}
                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition disabled:opacity-50"
                        >
                            {profileSaving ? 'Enregistrement...' : 'Mettre à jour le profil'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Password Form */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                    <KeyRound className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white">Changer de Mot de Passe</h2>
                </div>

                {passwordMsg && (
                    <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                        passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {passwordMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                        <span>{passwordMsg.text}</span>
                    </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                    <div>
                        <label className="block text-slate-400 font-medium mb-1">Mot de passe actuel</label>
                        <input
                            type="password"
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-400 font-medium mb-1">Nouveau mot de passe</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 font-medium mb-1">Confirmer le mot de passe</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={passwordSaving}
                            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition disabled:opacity-50"
                        >
                            {passwordSaving ? 'Modification...' : 'Modifier le mot de passe'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
