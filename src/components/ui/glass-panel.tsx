import { cn } from "@/lib/utils";
import type { ReactNode, HTMLAttributes } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "liquid" | "neo" | "inset" | "mini";
  hover?: boolean;
  className?: string;
}

export default function GlassPanel({
  children,
  variant = "liquid",
  hover = false,
  className,
  ...props
}: GlassPanelProps) {
  const variants = {
    liquid: "liquid-glass",
    neo: "neo-card",
    inset: "neo-inset",
    mini: "mini-morph",
  };

  return (
    <div
      className={cn(
        variants[variant],
        hover && "transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
