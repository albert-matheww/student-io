"use client";

import { motion } from "framer-motion";
import { Flame, BookOpen, Brain, TrendingUp } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Badge } from "@/components/ui/badge";

const WEAK_TOPICS = [
  { name: "Subnetting", score: 42, tone: "amber" as const },
  { name: "Congestion Control", score: 58, tone: "amber" as const },
];

const UPCOMING = [
  { name: "Routing Algorithms", minutes: 18 },
  { name: "Network Security", minutes: 25 },
];

export function HeroPreviewCard() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="relative rounded-3xl border border-border bg-card shadow-float">
        <div className="flex items-center gap-1.5 border-b border-border px-5 py-3.5">
          <span className="size-2.5 rounded-full bg-brand-purple/40" />
          <span className="size-2.5 rounded-full bg-brand-amber/40" />
          <span className="size-2.5 rounded-full bg-brand-emerald/40" />
          <span className="ml-3 text-xs font-medium text-muted-foreground">
            Computer Networks · Course Dashboard
          </span>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-muted/50 p-6">
            <ProgressRing value={68} tone="indigo" size={104} sublabel="Complete" />
            <div className="flex items-center gap-1.5 text-xs font-medium text-brand-amber">
              <Flame className="size-3.5" />
              12-day streak
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                <Brain className="size-3.5" />
                <span className="text-[0.7rem] font-medium">Weak topics</span>
              </div>
              <ul className="space-y-1.5">
                {WEAK_TOPICS.map((t) => (
                  <li key={t.name} className="flex items-center justify-between text-xs">
                    <span className="truncate text-foreground/80">{t.name}</span>
                    <Badge variant="outline" className="border-brand-amber/30 text-brand-amber">
                      {t.score}%
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                <BookOpen className="size-3.5" />
                <span className="text-[0.7rem] font-medium">Up next</span>
              </div>
              <ul className="space-y-1.5">
                {UPCOMING.map((l) => (
                  <li key={l.name} className="flex items-center justify-between text-xs">
                    <span className="truncate text-foreground/80">{l.name}</span>
                    <span className="text-muted-foreground">{l.minutes}m</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-indigo to-brand-electric p-3.5 text-primary-foreground">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4" />
                <span className="text-xs font-medium">Exam readiness</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">74%</span>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-6 -left-6 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-float sm:block"
      >
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="flex size-6 items-center justify-center rounded-full bg-brand-emerald/15 text-brand-emerald">
            ✓
          </span>
          Flashcard mastered
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="absolute -right-4 -bottom-6 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-float sm:block"
      >
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="flex size-6 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
            AI
          </span>
          &ldquo;Explain recursion simply&rdquo;
        </div>
      </motion.div>
    </div>
  );
}
