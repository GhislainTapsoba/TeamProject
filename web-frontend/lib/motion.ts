import type { Transition, Variants } from 'motion/react';

// Une seule courbe et un seul ressort pour toute l'application : le mouvement reste cohérent
export const ease = [0.22, 1, 0.36, 1] as const;
export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease } },
};
