
import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "intense";
}

export function GlowCard({ children, className, variant = "default" }: GlowCardProps) {
  return (
    <div className={cn(
      "glow-border card-hover",
      variant === "intense" && "hover:shadow-[0_0_40px_rgba(147,51,234,0.4)]",
      className
    )}>
      <div className="glass rounded-lg p-6 h-full w-full">
        {children}
      </div>
    </div>
  );
}
