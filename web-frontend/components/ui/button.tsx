'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
    primary:
        'text-white bg-gradient-to-b from-brand-500 to-brand-600 shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_8px_24px_-8px_rgba(8,32,216,0.8)] hover:brightness-110',
    secondary: 'text-zinc-100 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]',
    ghost: 'text-zinc-300 hover:text-white hover:bg-white/[0.06]',
    danger: 'text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20',
};

const sizes: Record<Size, string> = {
    sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
    md: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
    lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

type Common = {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: React.ElementType;
    className?: string;
    children?: React.ReactNode;
};

const classes = (variant: Variant, size: Size, className?: string) =>
    cn(
        'relative inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none select-none',
        variants[variant],
        sizes[size],
        className
    );

const press = { whileHover: { y: -1 }, whileTap: { scale: 0.97, y: 0 } };

export function Button({
    variant = 'primary',
    size = 'md',
    loading,
    icon: Icon,
    className,
    children,
    disabled,
    ...props
}: Common & Omit<React.ComponentProps<typeof motion.button>, 'children'>) {
    return (
        <motion.button {...press} className={classes(variant, size, className)} disabled={disabled || loading} {...props}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
            {children}
        </motion.button>
    );
}

const MotionLink = motion.create(Link);

export function ButtonLink({ variant = 'primary', size = 'md', icon: Icon, className, children, href }: Common & { href: string }) {
    return (
        <MotionLink {...press} href={href} className={classes(variant, size, className)}>
            {Icon && <Icon className="h-4 w-4" />}
            {children}
        </MotionLink>
    );
}
