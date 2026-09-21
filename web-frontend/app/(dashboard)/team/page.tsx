'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api';
import {
    Users,
    UserPlus,
    Shield,
    Mail,
    Phone,
    CheckCircle2,
    X,
    MoreVertical
} from 'lucide-react';

export default function TeamPage() {
    const { user, tenant } = useAuth();
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState<'admin' | 'manager' | 'employee'>('employee');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadTeam();
    }, []);

    const loadTeam = async () => {
        try {
            const res = await usersAPI.getAll();
            setTeam(res.data.results || res.data || []);
        } catch (e) {
            console.error('Error loading team:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await usersAPI.create({
                email,
                username: email,
                first_name: firstName,
                last_name: lastName,
                role,
                phone,
                password,
            });
            setIsOpen(false);
            setEmail('');
            setFirstName('');
            setLastName('');
            setPhone('');
            loadTeam();
        } catch (err) {
            console.error('Error creating user:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const roleBadge = (role: string) => {
        if (role === 'admin') {
            return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">Admin</span>;
        }
        if (role === 'manager') {
            return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">Manager</span>;
        }
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">Employé</span>;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Équipe & Collaborateurs</h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Membres de votre organisation <strong>{tenant?.name}</strong> et leurs permissions RBAC.
                    </p>
                </div>

                {user?.role === 'admin' && (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
                    >
                        <UserPlus className="h-4 w-4" />
                        <span>Ajouter un Collaborateur</span>
                    </button>
                )}
            </div>

            {/* Team Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-slate-900/40 rounded-xl border border-slate-800 animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {team.map((member) => (
                        <div
                            key={member.id}
                            className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                        >
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center font-bold text-white shadow">
                                    {member.first_name ? member.first_name[0] : member.username[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-white truncate">{member.full_name}</h3>
                                        {roleBadge(member.role)}
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-1">
                                        <Mail className="h-3 w-3 text-slate-500" />
                                        <span>{member.email}</span>
                                    </p>
                                    {member.phone && (
                                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                                            <Phone className="h-3 w-3" />
                                            <span>{member.phone}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                                <span>Rejoint le {new Date(member.date_joined).toLocaleDateString('fr-FR')}</span>
                                <span className={`inline-flex items-center gap-1 ${member.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${member.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                    {member.is_active ? 'Actif' : 'Inactif'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Invite Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h2 className="text-sm font-bold text-white">Ajouter un collaborateur</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 text-slate-500 hover:text-white rounded-md transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleInviteUser} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Prénom</label>
                                    <input
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Nom</label>
                                    <input
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 font-medium mb-1">Email professionnel *</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Rôle</label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as any)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="employee">Employé</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Administrateur</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 font-medium mb-1">Téléphone</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+226 70000000"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 font-medium mb-1">Mot de passe provisoire</label>
                                <input
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                                >
                                    {submitting ? 'Ajout...' : 'Ajouter le membre'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
