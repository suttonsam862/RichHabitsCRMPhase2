import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function GlowCard({ children, className, onClick }: GlowCardProps) {
  return (
    <div 
      className={cn(
        "relative group rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm",
        "hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10",
        "transition-all duration-300 cursor-pointer",
        "before:absolute before:inset-0 before:rounded-2xl before:p-px",
        "before:bg-gradient-to-b before:from-white/20 before:to-transparent",
        "before:mask-composite before:mask-[linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]",
        "before:mask-composite before:mask-mode-exclude",
        className
      )}
      onClick={onClick}
    >
      <div className="relative rounded-2xl bg-gradient-to-b from-black/10 to-black/30 p-1">
        {children}
      </div>
    </div>
  );
}