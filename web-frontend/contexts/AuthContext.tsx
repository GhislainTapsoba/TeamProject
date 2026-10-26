'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, tenantsAPI } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface User {
    id: number | string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    full_name: string;
    role: 'admin' | 'manager' | 'employee';
    phone?: string;
    avatar_url?: string;
}

export interface Tenant {
    name: string;
    schema_name: string;
    plan: string;
}

interface AuthContextType {
    user: User | null;
    tenant: Tenant | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const clearLocalState = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('tenant');
        setToken(null);
        setUser(null);
    };

    const loadTenant = async () => {
        try {
            const tenantRes = await tenantsAPI.getCurrent();
            if (tenantRes.data?.name) {
                setTenant(tenantRes.data);
                localStorage.setItem('tenant', JSON.stringify(tenantRes.data));
            }
        } catch (e) {
            // Tenant may be public schema
        }
    };

    useEffect(() => {
        // The platform console (/platform) has its own super-admin session and must not
        // be driven by the tenant AuthContext, whose /auth/me call would 401 and sign it out.
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/platform')) {
            setIsLoading(false);
            return;
        }

        const initAuth = async () => {
            const storedUser = localStorage.getItem('user');
            const storedTenant = localStorage.getItem('tenant');
            if (storedTenant) {
                setTenant(JSON.parse(storedTenant));
            }

            const { data } = await supabase.auth.getSession();
            if (data.session) {
                setToken(data.session.access_token);
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
                // Verify fresh profile (and tenant membership) in background
                try {
                    const meRes = await authAPI.me();
                    setUser(meRes.data);
                    localStorage.setItem('user', JSON.stringify(meRes.data));
                } catch (e) {
                    clearLocalState();
                }
            } else {
                clearLocalState();
            }

            await loadTenant();
            setIsLoading(false);
        };

        initAuth();

        // Keep the token in sync with Supabase's automatic refreshes and sign-outs
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                clearLocalState();
            } else if (session) {
                setToken(session.access_token);
            }
        });
        return () => listener.subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.session) {
            throw new Error('Email ou mot de passe incorrect. Vérifiez-les et réessayez.');
        }

        try {
            const meRes = await authAPI.me();
            localStorage.setItem('user', JSON.stringify(meRes.data));
            setToken(data.session.access_token);
            setUser(meRes.data);
        } catch (err: any) {
            // The Supabase account exists but is not allowed in this organisation
            await supabase.auth.signOut();
            clearLocalState();
            throw new Error(err.response?.data?.detail || "Impossible d'accéder à cet espace.");
        }

        await loadTenant();
    };

    const logout = async () => {
        await supabase.auth.signOut();
        clearLocalState();
        localStorage.removeItem('tenant');
        setTenant(null);
        window.location.href = '/login';
    };

    const refreshProfile = async () => {
        try {
            const res = await authAPI.me();
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
        } catch (e) {
            console.error('Error refreshing profile:', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, tenant, token, isLoading, login, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
