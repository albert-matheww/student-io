"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

const STEPS = [
  { path: "/onboarding/profile", label: "Profile" },
  { path: "/onboarding/syllabus", label: "Syllabus" },
  { path: "/onboarding/upload", label: "Resources" },
];

export function StepHeader() {
  const pathname = usePathname();
  const activeIndex = Math.max(0, STEPS.findIndex((s) => pathname?.startsWith(s.path)));

  return (
    <header className="relative z-10 flex flex-col gap-6 px-6 pt-6 sm:px-10">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="text-xs font-medium text-muted-foreground">
          Step {activeIndex + 1} of {STEPS.length}
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-md items-center gap-2">
        {STEPS.map((step, index) => (
          <div key={step.path} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              {index <= activeIndex && (
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-indigo to-brand-electric"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </div>
            <span
              className={cn(
                "text-[0.68rem] font-medium transition-colors",
                index <= activeIndex ? "text-foreground" : "text-muted-foreground/60"
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </header>
  );
}
