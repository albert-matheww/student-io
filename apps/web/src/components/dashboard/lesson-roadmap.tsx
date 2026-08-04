"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Clock, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { ModuleDetail } from "@/lib/api";
import { cn } from "@/lib/utils";

export function LessonRoadmap({ courseId, modules }: { courseId: string; modules: ModuleDetail[] }) {
  const firstIncomplete = modules[0]?.id;

  return (
    <Accordion type="multiple" defaultValue={firstIncomplete ? [firstIncomplete] : []} className="flex flex-col gap-3">
      {modules.map((module, index) => {
        const completedCount = module.lessons.filter((l) => l.is_completed).length;
        return (
          <AccordionItem
            key={module.id}
            value={module.id}
            className="rounded-2xl border border-border bg-card px-4 shadow-xs"
          >
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="flex flex-1 items-center justify-between pr-2">
                <div className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold">{module.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {completedCount}/{module.lessons.length} · {module.estimated_hours ?? "—"}h
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-1 pb-3">
                {module.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/dashboard/${courseId}/lessons/${lesson.slug}`}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm transition-colors hover:bg-accent/50"
                  >
                    {lesson.is_completed ? (
                      <CheckCircle2 className="size-4 shrink-0 text-brand-emerald" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className={cn("flex-1 truncate", lesson.is_completed && "text-muted-foreground")}>
                      {lesson.title}
                    </span>
                    {lesson.origin === "ai_supplement" && (
                      <Badge variant="outline" className="gap-1 border-brand-purple/30 text-[0.65rem] text-brand-purple">
                        <Sparkles className="size-2.5" />
                        AI
                      </Badge>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {lesson.estimated_minutes ?? "—"}m
                    </span>
                  </Link>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
