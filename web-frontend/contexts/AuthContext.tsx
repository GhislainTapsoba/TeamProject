'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, tenantsAPI } from '@/lib/api';

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
    logout: () => void;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedAccess = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');
            const storedTenant = localStorage.getItem('tenant');

            if (storedAccess && storedUser) {
                setToken(storedAccess);
                setUser(JSON.parse(storedUser));
                if (storedTenant) {
                    setTenant(JSON.parse(storedTenant));
                }
                // Also verify fresh profile in background
                try {
                    const meRes = await authAPI.me();
                    setUser(meRes.data);
                    localStorage.setItem('user', JSON.stringify(meRes.data));
                } catch (e) {
                    // Handled by axios interceptor
                }
            }

            // Also check active tenant info from backend
            try {
                const tenantRes = await tenantsAPI.getCurrent();
                if (tenantRes.data?.name) {
                    setTenant(tenantRes.data);
                    localStorage.setItem('tenant', JSON.stringify(tenantRes.data));
                }
            } catch (e) {
                // Tenant may be public schema
            }

            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await authAPI.login({ email, password });
        const { access, refresh, user: loggedUser, tenant: loggedTenant } = response.data;

        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(loggedUser));
        
        if (loggedTenant) {
            localStorage.setItem('tenant', JSON.stringify(loggedTenant));
            setTenant(loggedTenant);
        }

        setToken(access);
        setUser(loggedUser);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('tenant');
        setToken(null);
        setUser(null);
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
