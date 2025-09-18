import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  gradient?: string;
  brandColors?: {
    primary: string;
    secondary: string;
  };
  onClick?: () => void;
  as?: 'div' | 'button' | 'a';
  href?: string;
  'data-testid'?: string;
  type?: 'button' | 'submit' | 'reset';
}


const GlowCard = forwardRef<HTMLElement, GlowCardProps>(({ 
  children, 
  className = "", 
  glowColor = "blue", 
  gradient, 
  brandColors, 
  onClick,
  as = onClick ? 'button' : 'div',
  href,
  type = as === 'button' ? 'button' : undefined,
  'data-testid': dataTestId,
  ...props 
}, ref) => {
  const cardStyle = gradient ? { backgroundImage: gradient } : {};
  const borderStyle = brandColors ? {
    borderImage: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary}) 1`
  } : {};

  const glowColors = {
    blue: "hover:shadow-blue-500/40 hover:border-blue-500/50",
    purple: "hover:shadow-purple-500/40 hover:border-purple-500/50", 
    cyan: "hover:shadow-cyan-500/40 hover:border-cyan-500/50",
    pink: "hover:shadow-pink-500/40 hover:border-pink-500/50"
  };

  const commonClasses = cn(
    "relative group",
    "bg-black/60 backdrop-blur-sm",
    "border border-white/10",
    "rounded-xl p-6",
    "transition-all duration-300",
    "hover:bg-black/80",
    "hover:border-white/30",
    glowColors[glowColor as keyof typeof glowColors] || glowColors.blue,
    "hover:shadow-2xl",
    onClick && [
      "hover:scale-[1.02] transition-transform",
      as === 'button' && "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full text-left"
    ],
    className
  );

  const Component = as;
  
  return (
    <Component 
      ref={ref as any}
      className={commonClasses}
      style={{ ...cardStyle, ...borderStyle }}
      onClick={onClick}
      href={as === 'a' ? href : undefined}
      type={as === 'button' ? type : undefined}
      data-testid={dataTestId}
      {...props}
    >
      {children}
    </Component>
  );
});

// Export both named and default for compatibility
export { GlowCard };
export default GlowCard;