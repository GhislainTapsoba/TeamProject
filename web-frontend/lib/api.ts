import axios from 'axios';
import { supabase } from '@/lib/supabase';

// Get base API URL
const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        // Browser environment: use relative /api which Nginx proxies to Django backend
        return '/api';
    }
    return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api';
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach the Supabase access token
api.interceptors.request.use(
    async (config) => {
        if (typeof window !== 'undefined') {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: refresh the Supabase session once on 401, then redirect to login
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && typeof window !== 'undefined') {
            originalRequest._retry = true;
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && data.session) {
                originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
                return api(originalRequest);
            }
            await supabase.auth.signOut();
            localStorage.removeItem('user');
            localStorage.removeItem('tenant');
            // Leave the platform console to manage its own session
            if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/platform')) {
                window.location.href = '/login';
            }
        }
        // Personne retirée de l'organisation pendant sa session : retour à la connexion, avec une explication
        const removed = error.response?.status === 403 && error.response?.data?.detail === "Vous n'êtes pas membre de cette organisation.";
        if (removed && typeof window !== 'undefined' && window.location.pathname !== '/login' && !window.location.pathname.startsWith('/platform')) {
            await supabase.auth.signOut();
            localStorage.removeItem('user');
            localStorage.removeItem('tenant');
            window.location.href = '/login?removed=1';
        }
        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authAPI = {
    me: () => api.get('/auth/me/'),
    updateProfile: (data: any) => api.patch('/auth/me/', data),
    changePassword: (data: { old_password: string; new_password: string }) =>
        api.post('/auth/change-password/', data),
};

// Tenants API
export const tenantsAPI = {
    register: (data: { organization_name: string; subdomain: string; admin_email: string; admin_name: string; admin_password: string }) =>
        api.post('/tenants/register/', data),
    getCurrent: () => api.get('/tenants/current/'),
};

// Team API
export const usersAPI = {
    getAll: () => api.get('/auth/users/'),
    create: (data: any) => api.post('/auth/users/', data),
    setRole: (id: number | string, role: string) => api.patch(`/auth/users/${id}/`, { role }),
    // Retire la personne de l'organisation ; son compte est conservé
    remove: (id: number | string) => api.delete(`/auth/users/${id}/`),
};

// Projects API
export const projectsAPI = {
    getAll: () => api.get('/projects/'),
    create: (data: any) => api.post('/projects/', data),
    update: (id: number | string, data: any) => api.patch(`/projects/${id}/`, data),
    delete: (id: number | string) => api.delete(`/projects/${id}/`),
    getKanban: (id: number | string) => api.get(`/projects/${id}/kanban/`),
    getMembers: (id: number | string) => api.get(`/projects/${id}/members/`),
    addMember: (projectId: number | string, userId: number | string) =>
        api.post(`/projects/${projectId}/members/`, { user_id: userId }),
    removeMember: (projectId: number | string, userId: number | string) =>
        api.delete(`/projects/${projectId}/members/`, { data: { user_id: userId } }),
};

// Tasks API
export const tasksAPI = {
    getMine: () => api.get('/projects/tasks/', { params: { my_tasks: true } }),
    create: (data: any) => api.post('/projects/tasks/', data),
    updateState: (id: number | string, state: 'todo' | 'in_progress' | 'done') =>
        api.patch(`/projects/tasks/${id}/update_state/`, { state }),
    delete: (id: number | string) => api.delete(`/projects/tasks/${id}/`),
};

// Notifications API
export const notificationsAPI = {
    getAll: () => api.get('/notifications/'),
    markAllRead: () => api.post('/notifications/mark_all_read/'),
    getUnreadCount: () => api.get('/notifications/unread_count/'),
};

// Billing API
export const billingAPI = {
    getPlans: () => api.get('/billing/plans/'),
    getSubscription: () => api.get('/billing/subscription/'),
    initiateCheckout: (planId: number | string) => api.post('/billing/checkout/', { plan_id: planId }),
    getPayments: () => api.get('/billing/payments/'),
    getPayment: (transactionId: string) => api.get(`/billing/payments/${encodeURIComponent(transactionId)}/`),
};

// Dashboard API
export const coreAPI = {
    getDashboardStats: () => api.get('/core/dashboard-stats/'),
};
