import React from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'blue' | 'green' | 'orange';
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-gradient-to-br from-purple-900/40 via-pink-800/30 to-red-900/40 border-purple-400/50 shadow-purple-500/20',
  blue: 'bg-gradient-to-br from-blue-900/40 via-cyan-800/30 to-teal-900/40 border-blue-400/50 shadow-blue-500/20',
  green: 'bg-gradient-to-br from-green-900/40 via-emerald-800/30 to-teal-900/40 border-green-400/50 shadow-green-500/20',
  orange: 'bg-gradient-to-br from-orange-900/40 via-red-800/30 to-pink-900/40 border-orange-400/50 shadow-orange-500/20'
};

export function GlowCard({ children, className, variant = 'default', onClick }: GlowCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border backdrop-blur-sm shadow-2xl',
        'hover:border-opacity-80 transition-all duration-300',
        'before:absolute before:inset-0 before:rounded-xl before:opacity-0 before:transition-opacity',
        'hover:before:opacity-30 before:bg-gradient-to-r before:from-white/5 before:to-white/10',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-xl',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}