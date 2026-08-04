"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ListChecks, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type CourseQuizzes } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function QuizzesPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["course-quizzes", courseId],
    queryFn: () => api.get<CourseQuizzes>(`/courses/${courseId}/quizzes`),
  });

  if (isLoading || !data) return <QuizzesSkeleton />;

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="mx-auto flex max-w-3xl flex-col gap-8">
      <motion.div variants={fadeUp}>
        <h1 className="font-serif text-3xl font-medium tracking-tight">Quizzes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Test what you know, lesson by lesson — accuracy feeds your exam readiness score.
        </p>
      </motion.div>

      {data.lessons.length === 0 ? (
        <motion.div variants={fadeUp} className="rounded-2xl border border-dashed border-border p-10 text-center">
          <ListChecks className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No quizzes yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Open a lesson to generate its quiz.</p>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          {data.lessons.map((lesson) => (
            <Link
              key={lesson.lesson_id}
              href={`/dashboard/${courseId}/lessons/${lesson.lesson_slug}?tab=quiz`}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-brand-indigo/40"
            >
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="truncate text-sm font-medium">{lesson.lesson_title}</span>
                <span className="text-xs text-muted-foreground">
                  {lesson.module_title} · {lesson.question_count} question{lesson.question_count === 1 ? "" : "s"}
                </span>
              </div>
              {lesson.accuracy !== null ? (
                <Badge
                  variant="outline"
                  className={cn(
                    lesson.accuracy >= 70
                      ? "border-brand-emerald/30 text-brand-emerald"
                      : "border-brand-amber/30 text-brand-amber"
                  )}
                >
                  {lesson.accuracy}%
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Not attempted</Badge>
              )}
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function QuizzesSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Skeleton className="h-9 w-40" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}
