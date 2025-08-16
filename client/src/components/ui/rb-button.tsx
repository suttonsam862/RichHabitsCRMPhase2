
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const rbButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "glow-border glass text-white hover:shadow-[0_0_20px_rgba(147,51,234,0.5)]",
        outline: "border border-white/20 bg-transparent hover:bg-white/5 text-white",
        ghost: "hover:bg-white/5 text-white/70 hover:text-white",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface RBButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof rbButtonVariants> {}

const RBButton = React.forwardRef<HTMLButtonElement, RBButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(rbButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
RBButton.displayName = "RBButton";

export { RBButton, rbButtonVariants };
