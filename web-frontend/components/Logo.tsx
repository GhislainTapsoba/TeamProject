import Image from 'next/image';
import { cn } from '@/lib/utils';

// Logo de Deep Technologies, à côté du nom de l'application
export default function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <Image src="/deep-technologies-logo.png" alt="Deep Technologies" width={36} height={36} priority className="h-9 w-9 object-contain" />
            {withText && (
                <span className="leading-tight">
                    <span className="block text-[15px] font-semibold tracking-tight text-ink">Team Project</span>
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-soft">Deep Technologies</span>
                </span>
            )}
        </span>
    );
}
