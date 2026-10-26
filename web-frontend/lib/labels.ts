// Libellés et couleurs partagés par toutes les pages

export type Tone = 'neutral' | 'accent' | 'flame' | 'success' | 'warning' | 'danger';

export type TaskState = 'todo' | 'in_progress' | 'done';

export const TASK_STATES: { id: TaskState; label: string; help: string; tone: Tone; dot: string }[] = [
    { id: 'todo', label: 'À faire', help: 'Pas encore commencées', tone: 'neutral', dot: 'bg-zinc-400' },
    { id: 'in_progress', label: 'En cours', help: "Quelqu'un s'en occupe", tone: 'flame', dot: 'bg-flame-500' },
    { id: 'done', label: 'Terminé', help: "C'est fini", tone: 'success', dot: 'bg-emerald-400' },
];

// L'étape suivante d'une tâche, proposée par un seul gros bouton
export const NEXT_STEP: Record<TaskState, { to: TaskState; label: string; done: string }> = {
    todo: { to: 'in_progress', label: 'Commencer', done: 'Tâche commencée.' },
    in_progress: { to: 'done', label: "J'ai terminé", done: 'Tâche terminée. Bravo !' },
    done: { to: 'todo', label: 'Rouvrir', done: 'Tâche remise à faire.' },
};

export const PRIORITIES: Record<string, { label: string; tone: Tone }> = {
    low: { label: 'Pas pressé', tone: 'neutral' },
    medium: { label: 'Normal', tone: 'flame' },
    high: { label: 'Urgent', tone: 'danger' },
};

export const PROJECT_STATUSES: Record<string, { label: string; tone: Tone }> = {
    planning: { label: 'Planification', tone: 'flame' },
    in_progress: { label: 'En cours', tone: 'accent' },
    on_hold: { label: 'En pause', tone: 'warning' },
    completed: { label: 'Terminé', tone: 'success' },
    cancelled: { label: 'Annulé', tone: 'danger' },
};

export const ROLES: Record<string, { label: string; tone: Tone }> = {
    admin: { label: 'Administrateur', tone: 'accent' },
    manager: { label: 'Manager', tone: 'flame' },
    employee: { label: 'Membre', tone: 'neutral' },
};

export const SUBSCRIPTION_STATUSES: Record<string, { label: string; tone: Tone }> = {
    active: { label: 'Actif', tone: 'success' },
    trial: { label: 'Essai', tone: 'flame' },
    past_due: { label: 'En retard', tone: 'warning' },
    cancelled: { label: 'Suspendu', tone: 'danger' },
};

export const PAYMENT_STATUSES: Record<string, { label: string; tone: Tone }> = {
    paid: { label: 'Payé', tone: 'success' },
    pending: { label: 'En attente', tone: 'warning' },
    failed: { label: 'Échoué', tone: 'danger' },
};
