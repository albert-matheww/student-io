"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardStudySession } from "@/components/lesson/flashcard-study";
import { api, type CourseFlashcards } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function FlashcardsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["course-flashcards", courseId],
    queryFn: () => api.get<CourseFlashcards>(`/courses/${courseId}/flashcards`),
  });

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  if (isLoading || !data) return <FlashcardsSkeleton />;

  if (data.lessons.length === 0) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <Layers className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No flashcards yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Open a lesson to generate its flashcard deck.</p>
      </div>
    );
  }

  const activeLesson = data.lessons.find((l) => l.lesson_id === activeLessonId) ?? data.lessons[0];

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="mx-auto flex max-w-5xl flex-col gap-8">
      <motion.div variants={fadeUp}>
        <h1 className="font-serif text-3xl font-medium tracking-tight">Flashcards</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Study by lesson — ratings feed spaced repetition and your confidence score.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-6 sm:grid-cols-[240px_1fr]">
        <nav className="flex flex-col gap-1">
          {data.lessons.map((lesson) => (
            <button
              key={lesson.lesson_id}
              onClick={() => setActiveLessonId(lesson.lesson_id)}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                lesson.lesson_id === activeLesson.lesson_id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <span className="truncate">{lesson.lesson_title}</span>
              <Badge variant="outline" className="ml-2 shrink-0 text-[0.65rem]">
                {lesson.flashcards.length}
              </Badge>
            </button>
          ))}
        </nav>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8" key={activeLesson.lesson_id}>
          <p className="mb-6 text-center text-xs font-medium text-muted-foreground">
            {activeLesson.module_title}
          </p>
          <FlashcardStudySession cards={activeLesson.flashcards} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function FlashcardsSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-6 sm:grid-cols-[240px_1fr]">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
