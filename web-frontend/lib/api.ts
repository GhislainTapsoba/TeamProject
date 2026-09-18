import axios from 'axios';

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

// Request interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry & auto redirect
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            if (typeof window !== 'undefined') {
                const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
                if (refreshToken) {
                    try {
                        const refreshRes = await axios.post('/api/auth/refresh/', { refresh: refreshToken });
                        const newAccess = refreshRes.data.access;
                        localStorage.setItem('access_token', newAccess);
                        sessionStorage.setItem('access_token', newAccess);
                        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
                        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                        return api(originalRequest);
                    } catch (refreshErr) {
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                    }
                } else {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authAPI = {
    login: (credentials: { username?: string; email?: string; password: string }) =>
        api.post('/auth/login/', {
            username: credentials.email || credentials.username,
            password: credentials.password
        }),
    me: () => api.get('/auth/me/'),
    updateProfile: (data: any) => api.patch('/auth/me/', data),
    changePassword: (data: { old_password: string; new_password: string }) =>
        api.post('/auth/change-password/', data),
};

// Tenants API (Shared & Tenant contexts)
export const tenantsAPI = {
    register: (data: { organization_name: string; subdomain: string; admin_email: string; admin_name: string; admin_password: string }) =>
        api.post('/tenants/register/', data),
    getCurrent: () => api.get('/tenants/current/'),
};

// Users / Team API
export const usersAPI = {
    getAll: (params?: any) => api.get('/auth/users/', { params }),
    getById: (id: number | string) => api.get(`/auth/users/${id}/`),
    create: (data: any) => api.post('/auth/users/', data),
    update: (id: number | string, data: any) => api.patch(`/auth/users/${id}/`, data),
    delete: (id: number | string) => api.delete(`/auth/users/${id}/`),
};

// Projects API
export const projectsAPI = {
    getAll: (params?: any) => api.get('/projects/', { params }),
    getById: (id: number | string) => api.get(`/projects/${id}/`),
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
    getAll: (params?: any) => api.get('/projects/tasks/', { params }),
    getById: (id: number | string) => api.get(`/projects/tasks/${id}/`),
    create: (data: any) => api.post('/projects/tasks/', data),
    update: (id: number | string, data: any) => api.patch(`/projects/tasks/${id}/`, data),
    updateState: (id: number | string, state: 'todo' | 'in_progress' | 'done', order?: number) =>
        api.patch(`/projects/tasks/${id}/update_state/`, { state, order }),
    delete: (id: number | string) => api.delete(`/projects/tasks/${id}/`),
};

// Notifications API
export const notificationsAPI = {
    getAll: () => api.get('/notifications/'),
    markRead: (id: number | string) => api.patch(`/notifications/${id}/mark_read/`),
    markAllRead: () => api.post('/notifications/mark_all_read/'),
    getUnreadCount: () => api.get('/notifications/unread_count/'),
};

// Billing & CinetPay API
export const billingAPI = {
    getPlans: () => api.get('/billing/plans/'),
    getSubscription: () => api.get('/billing/subscription/'),
    initiateCheckout: (planId: number | string, returnUrl?: string) =>
        api.post('/billing/checkout/', { plan_id: planId, return_url: returnUrl }),
};

// Core / Dashboard API
export const coreAPI = {
    getDashboardStats: () => api.get('/core/dashboard-stats/'),
    getActivityLogs: () => api.get('/core/activity-logs/'),
};
