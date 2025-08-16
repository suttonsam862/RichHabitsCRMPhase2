
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <main className={cn("container mx-auto px-4 py-10 space-y-8 max-w-7xl", className)}>
      {children}
    </main>
  );
}
