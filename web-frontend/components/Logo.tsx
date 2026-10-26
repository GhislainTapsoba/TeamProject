import { cn } from '@/lib/utils';

export default function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-400 via-violet-600 to-indigo-700 shadow-glow">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 7h14M12 7v11" />
                </svg>
            </span>
            {withText && <span className="text-[15px] font-semibold tracking-tight text-white">Team Project</span>}
        </span>
    );
}
