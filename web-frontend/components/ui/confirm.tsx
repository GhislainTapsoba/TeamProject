'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

type Request = { title: string; message?: string; confirmLabel: string; danger?: boolean };
type ConfirmFn = (request: Request) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Remplace la fenêtre grise du navigateur par une question claire avec deux gros boutons
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [pending, setPending] = useState<(Request & { resolve: (ok: boolean) => void }) | null>(null);

    const confirm = useCallback<ConfirmFn>((request) => new Promise((resolve) => setPending({ ...request, resolve })), []);

    const answer = (ok: boolean) => {
        pending?.resolve(ok);
        setPending(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Modal open={!!pending} onClose={() => answer(false)} title={pending?.title || ''} description={pending?.message}>
                <ModalActions>
                    <Button variant="secondary" size="lg" onClick={() => answer(false)}>
                        Non, annuler
                    </Button>
                    <Button variant={pending?.danger ? 'danger' : 'primary'} size="lg" onClick={() => answer(true)}>
                        {pending?.confirmLabel}
                    </Button>
                </ModalActions>
            </Modal>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
    return context;
}
