import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  indigo: "bg-brand-indigo/10 text-brand-indigo",
  electric: "bg-brand-electric/10 text-brand-electric",
  emerald: "bg-brand-emerald/10 text-brand-emerald",
  amber: "bg-brand-amber/10 text-brand-amber",
  purple: "bg-brand-purple/10 text-brand-purple",
} as const;

export function StatCard({
  icon,
  label,
  value,
  sublabel,
  tone = "indigo",
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  tone?: keyof typeof TONE_CLASSES;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3.5 rounded-2xl border border-border bg-card p-5 shadow-xs", className)}>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONE_CLASSES[tone])}>
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {sublabel && <span className="mt-0.5 text-xs text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
