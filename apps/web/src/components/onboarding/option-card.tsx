"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function OptionCard({
  selected,
  onClick,
  icon,
  title,
  description,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-brand-indigo bg-accent shadow-glow"
          : "border-border bg-card hover:border-brand-indigo/40 hover:bg-accent/40",
        className
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-brand-indigo text-primary-foreground">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
      {icon && <span className="text-xl">{icon}</span>}
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {description && <span className="text-xs text-muted-foreground">{description}</span>}
    </motion.button>
  );
}
