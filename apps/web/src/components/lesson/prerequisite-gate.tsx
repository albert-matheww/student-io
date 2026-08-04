"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GitBranch, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Prerequisite } from "@/lib/api";

export function PrerequisiteGate({
  courseId,
  lessonTitle,
  prerequisites,
  onSkip,
}: {
  courseId: string;
  lessonTitle: string;
  prerequisites: Prerequisite[];
  onSkip: () => void;
}) {
  const firstIncomplete = prerequisites.find((p) => !p.is_completed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 rounded-2xl border border-brand-amber/30 bg-brand-amber/5 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-amber/15 text-brand-amber">
          <GitBranch className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">
            Before starting {lessonTitle}, we recommend completing these prerequisite topics first
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Skipping ahead is fine — you just might hit gaps in what this lesson assumes you already know.
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {prerequisites.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm"
          >
            <span
              className={
                p.is_completed
                  ? "size-1.5 rounded-full bg-brand-emerald"
                  : "size-1.5 rounded-full bg-muted-foreground/40"
              }
            />
            <Link href={`/dashboard/${courseId}/lessons/${p.slug}`} className="flex-1 truncate hover:text-brand-indigo">
              {p.title}
            </Link>
            {p.estimated_minutes && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {p.estimated_minutes}m
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        {firstIncomplete && (
          <Button asChild size="sm">
            <Link href={`/dashboard/${courseId}/lessons/${firstIncomplete.slug}`}>
              Learn Prerequisites
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip Anyway
        </Button>
      </div>
    </motion.div>
  );
}
