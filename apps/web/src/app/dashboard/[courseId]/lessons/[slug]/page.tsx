"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  BarChart3,
  Sparkles,
  ListChecks,
  Layers,
  BookOpen,
  MessageCircleQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoteBlockView } from "@/components/lesson/note-block";
import { PrerequisiteGate } from "@/components/lesson/prerequisite-gate";
import { ConceptConnections } from "@/components/lesson/concept-connections";
import { YoutubeRecommendations } from "@/components/lesson/youtube-recommendations";
import { FlashcardDeck } from "@/components/lesson/flashcard-deck";
import { QuizPanel } from "@/components/lesson/quiz-panel";
import { AskAiPanel } from "@/components/lesson/ask-ai-panel";
import { api, type LessonCompleteResult, type LessonDetail } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { toastNewAchievements } from "@/lib/achievements";

export default function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; slug: string }>;
}) {
  const { courseId, slug } = use(params);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "notes";
  const [prereqSkipped, setPrereqSkipped] = useState(false);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", courseId, slug],
    queryFn: () => api.get<LessonDetail>(`/courses/${courseId}/lessons/${encodeURIComponent(slug)}`),
  });

  const markComplete = async () => {
    if (!lesson) return;
    const result = await api.post<LessonCompleteResult>(`/lessons/${lesson.id}/complete`);
    toast.success("Lesson marked complete", {
      description: "Revision has been scheduled for tomorrow, +3 days, +7 days…",
    });
    toastNewAchievements(result.new_achievements);
    queryClient.invalidateQueries({ queryKey: ["lesson", courseId, slug] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", courseId] });
    queryClient.invalidateQueries({ queryKey: ["course", courseId] });
    queryClient.invalidateQueries({ queryKey: ["gamification"] });
  };

  if (isLoading || !lesson) return <LessonSkeleton />;

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="mx-auto flex max-w-3xl flex-col gap-6">
      <motion.div variants={fadeUp}>
        <Link
          href={`/dashboard/${courseId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to {lesson.course_name}
        </Link>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="capitalize">{lesson.difficulty ?? "beginner"}</Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {lesson.estimated_minutes ?? "—"} min
          </span>
          {lesson.origin === "ai_supplement" && (
            <Badge variant="outline" className="gap-1 border-brand-purple/30 text-brand-purple">
              <Sparkles className="size-3" />
              AI Supplement
            </Badge>
          )}
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-balance">{lesson.title}</h1>
        {lesson.overview && <p className="text-sm leading-relaxed text-muted-foreground">{lesson.overview}</p>}
      </motion.div>

      {!lesson.is_completed && !prereqSkipped && lesson.prerequisites.some((p) => !p.is_completed) && (
        <motion.div variants={fadeUp}>
          <PrerequisiteGate
            courseId={courseId}
            lessonTitle={lesson.title}
            prerequisites={lesson.prerequisites}
            onSkip={() => setPrereqSkipped(true)}
          />
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <Button
          onClick={markComplete}
          disabled={lesson.is_completed}
          variant={lesson.is_completed ? "secondary" : "default"}
          className="gap-1.5"
        >
          <CheckCircle2 className="size-4" />
          {lesson.is_completed ? "Completed" : "Mark as complete"}
        </Button>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Tabs defaultValue={initialTab}>
          <TabsList>
            <TabsTrigger value="notes" className="gap-1.5">
              <BookOpen className="size-3.5" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="gap-1.5">
              <Layers className="size-3.5" />
              Flashcards
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-1.5">
              <ListChecks className="size-3.5" />
              Quiz
            </TabsTrigger>
            <TabsTrigger value="ask" className="gap-1.5">
              <MessageCircleQuestion className="size-3.5" />
              Ask AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="flex flex-col gap-4 pt-2">
            {lesson.content?.blocks.map((block, i) => (
              <NoteBlockView key={i} block={block} />
            ))}

            {lesson.content?.key_takeaways && lesson.content.key_takeaways.length > 0 && (
              <div className="rounded-2xl border border-brand-indigo/20 bg-accent/30 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <BarChart3 className="size-4 text-brand-indigo" />
                  <p className="text-sm font-semibold">Key takeaways</p>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {lesson.content.key_takeaways.map((t, i) => (
                    <li key={i} className="text-sm text-foreground/90">
                      · {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lesson.content?.common_mistakes && lesson.content.common_mistakes.length > 0 && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="mb-2 text-sm font-semibold text-destructive">Common mistakes</p>
                <ul className="flex flex-col gap-1.5">
                  {lesson.content.common_mistakes.map((t, i) => (
                    <li key={i} className="text-sm text-foreground/90">
                      · {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ConceptConnections courseId={courseId} related={lesson.related_concepts} unlocks={lesson.unlocks} />
            <YoutubeRecommendations videos={lesson.recommended_videos} />
          </TabsContent>

          <TabsContent value="flashcards" className="pt-4">
            <FlashcardDeck cards={lesson.flashcards} />
          </TabsContent>

          <TabsContent value="quiz" className="pt-4">
            <QuizPanel questions={lesson.questions} />
          </TabsContent>

          <TabsContent value="ask" className="pt-4">
            <AskAiPanel lessonId={lesson.id} lessonTitle={lesson.title} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

function LessonSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
