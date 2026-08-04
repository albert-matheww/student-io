"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpenCheck, Brain, Target, RotateCcw, ArrowRight, Flame } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatCard } from "@/components/dashboard/stat-card";
import { LessonRoadmap } from "@/components/dashboard/lesson-roadmap";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type CourseDetail, type DashboardStats } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function CourseDashboardPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);

  const courseQuery = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => api.get<CourseDetail>(`/courses/${courseId}`),
  });
  const statsQuery = useQuery({
    queryKey: ["dashboard", courseId],
    queryFn: () => api.get<DashboardStats>(`/courses/${courseId}/dashboard`),
  });

  if (courseQuery.isLoading || statsQuery.isLoading) return <DashboardSkeleton />;
  if (courseQuery.isError || !courseQuery.data) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this course.</p>
      </div>
    );
  }

  const course = courseQuery.data;
  const stats = statsQuery.data;
  const nextLesson = stats?.upcoming_lessons[0];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer(0.06)}
      className="mx-auto flex max-w-5xl flex-col gap-8"
    >
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Course</p>
          <h1 className="font-serif text-3xl font-medium tracking-tight">{course.name}</h1>
        </div>
        {nextLesson && (
          <Button asChild className="shadow-soft">
            <Link href={`/dashboard/${courseId}/lessons/${nextLesson.slug}`}>
              Continue: {nextLesson.title}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-6 shadow-xs">
          <ProgressRing value={stats?.completion_percent ?? 0} size={112} tone="indigo" sublabel="Complete" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Flame className="size-5" />}
            label="Study Streak"
            value={`${stats?.study_streak ?? 0}d`}
            tone="amber"
          />
          <StatCard
            icon={<Target className="size-5" />}
            label="Quiz Accuracy"
            value={`${stats?.quiz_accuracy ?? 0}%`}
            tone="electric"
          />
          <StatCard
            icon={<BookOpenCheck className="size-5" />}
            label="Exam Readiness"
            value={`${stats?.exam_readiness ?? 0}%`}
            tone="emerald"
          />
          <StatCard
            icon={<RotateCcw className="size-5" />}
            label="Revision Due"
            value={`${stats?.revision_due_count ?? 0}`}
            tone="purple"
          />
        </div>
      </motion.div>

      {stats && stats.weak_topics.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="size-4 text-brand-amber" />
            <h2 className="text-sm font-semibold">Weak topics to revisit</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {stats.weak_topics.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/dashboard/${courseId}/lessons/${lesson.slug}`}
                className="flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <span className="truncate">{lesson.title}</span>
                <span className="text-xs font-medium text-brand-amber">
                  {Math.round(lesson.confidence_score)}%
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <h2 className="mb-3 text-sm font-semibold">Your learning roadmap</h2>
        <LessonRoadmap courseId={courseId} modules={course.modules} />
      </motion.div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <Skeleton className="h-40 w-40 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
