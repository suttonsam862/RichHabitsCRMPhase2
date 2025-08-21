import { cn } from "@/lib/utils";

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'blue' | 'green' | 'orange';
}

export function GlowCard({ children, className, variant = 'default', ...props }: GlowCardProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'blue': return 'neon-card-blue';
      case 'green': return 'neon-card-green';
      case 'orange': return 'neon-card-orange';
      default: return 'neon-card';
    }
  };

  return (
    <div
      className={cn(
        getVariantClass(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}