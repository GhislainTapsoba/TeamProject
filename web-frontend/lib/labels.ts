// Libellés et couleurs partagés par toutes les pages

export type Tone = 'neutral' | 'accent' | 'sky' | 'success' | 'warning' | 'danger';

export type TaskState = 'todo' | 'in_progress' | 'done';

export const TASK_STATES: { id: TaskState; label: string; tone: Tone; dot: string }[] = [
    { id: 'todo', label: 'À faire', tone: 'neutral', dot: 'bg-zinc-400' },
    { id: 'in_progress', label: 'En cours', tone: 'accent', dot: 'bg-violet-400' },
    { id: 'done', label: 'Terminé', tone: 'success', dot: 'bg-emerald-400' },
];

export const PRIORITIES: Record<string, { label: string; tone: Tone }> = {
    low: { label: 'Basse', tone: 'neutral' },
    medium: { label: 'Moyenne', tone: 'warning' },
    high: { label: 'Haute', tone: 'danger' },
};

export const PROJECT_STATUSES: Record<string, { label: string; tone: Tone }> = {
    planning: { label: 'Planification', tone: 'sky' },
    in_progress: { label: 'En cours', tone: 'accent' },
    on_hold: { label: 'En pause', tone: 'warning' },
    completed: { label: 'Terminé', tone: 'success' },
    cancelled: { label: 'Annulé', tone: 'danger' },
};

export const ROLES: Record<string, { label: string; tone: Tone }> = {
    admin: { label: 'Administrateur', tone: 'accent' },
    manager: { label: 'Manager', tone: 'sky' },
    employee: { label: 'Membre', tone: 'neutral' },
};

export const SUBSCRIPTION_STATUSES: Record<string, { label: string; tone: Tone }> = {
    active: { label: 'Actif', tone: 'success' },
    trial: { label: 'Essai', tone: 'sky' },
    past_due: { label: 'En retard', tone: 'warning' },
    cancelled: { label: 'Suspendu', tone: 'danger' },
};

export const PAYMENT_STATUSES: Record<string, { label: string; tone: Tone }> = {
    paid: { label: 'Payé', tone: 'success' },
    pending: { label: 'En attente', tone: 'warning' },
    failed: { label: 'Échoué', tone: 'danger' },
};
