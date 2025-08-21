import React from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  gradient?: string;
  brandColors?: {
    primary: string;
    secondary: string;
  };
}

const variantStyles = {
  default: 'bg-gradient-to-br from-purple-900/40 via-pink-800/30 to-red-900/40 border-purple-400/50 shadow-purple-500/20',
  blue: 'bg-gradient-to-br from-blue-900/40 via-cyan-800/30 to-teal-900/40 border-blue-400/50 shadow-blue-500/20',
  green: 'bg-gradient-to-br from-green-900/40 via-emerald-800/30 to-teal-900/40 border-green-400/50 shadow-green-500/20',
  orange: 'bg-gradient-to-br from-orange-900/40 via-red-800/30 to-pink-900/40 border-orange-400/50 shadow-orange-500/20'
};

export function GlowCard({ children, className = "", glowColor = "blue", gradient, brandColors }: GlowCardProps) {
  const cardStyle = gradient ? { backgroundImage: gradient } : {};
  const borderStyle = brandColors ? {
    borderImage: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary}) 1`
  } : {};

  return (
    <div 
      className={cn(
        "relative group",
        "bg-gray-900/50 backdrop-blur-sm",
        "border border-white/10",
        "rounded-xl p-6",
        "transition-all duration-300",
        "hover:bg-gray-900/70",
        "hover:border-white/20",
        "hover:shadow-lg hover:shadow-blue-500/20",
        className
      )}
      style={{ ...cardStyle, ...borderStyle }}
    >
      {children}
    </div>
  );
}