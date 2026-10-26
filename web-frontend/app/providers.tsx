'use client';

import { MotionConfig } from 'motion/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm';

// Les animations suivent le réglage « réduire les animations » du système
export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <MotionConfig reducedMotion="user">
            <ToastProvider>
                <ConfirmProvider>
                    <AuthProvider>{children}</AuthProvider>
                </ConfirmProvider>
            </ToastProvider>
        </MotionConfig>
    );
}
