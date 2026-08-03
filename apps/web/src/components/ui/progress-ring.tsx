"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const TONE_VAR: Record<NonNullable<ProgressRingProps["tone"]>, string> = {
  indigo: "var(--brand-indigo)",
  electric: "var(--brand-electric)",
  emerald: "var(--brand-emerald)",
  amber: "var(--brand-amber)",
  purple: "var(--brand-purple)",
};

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  tone?: "indigo" | "electric" | "emerald" | "amber" | "purple";
  label?: string;
  sublabel?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  tone = "indigo",
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color = TONE_VAR[tone];

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums leading-none">
          {label ?? `${Math.round(clamped)}%`}
        </span>
        {sublabel && (
          <span className="mt-1 text-[0.65rem] font-medium text-muted-foreground leading-none">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
