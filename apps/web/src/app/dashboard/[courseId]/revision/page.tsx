"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CalendarClock, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type RevisionCompleteResult, type RevisionItem, type RevisionQueue } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { toastNewAchievements } from "@/lib/achievements";
import { cn } from "@/lib/utils";

export default function RevisionPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["revision", courseId],
    queryFn: () => api.get<RevisionQueue>(`/courses/${courseId}/revision`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["revision", courseId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", courseId] });
    queryClient.invalidateQueries({ queryKey: ["gamification"] });
  };

  const rate = async (item: RevisionItem, success: boolean) => {
    const result = await api.post<RevisionCompleteResult>(
      `/revision/${item.schedule_id}/complete`,
      { success }
    );
    invalidate();
    toastNewAchievements(result.new_achievements);
    if (result.mastered) {
      toast.success(`${item.lesson_title} mastered!`, {
        description: "This topic has moved beyond active revision.",
      });
    } else {
      toast.success(success ? "Nice — pushed further out" : "Scheduled for tomorrow", {
        description: `Next review: ${new Date(result.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
      });
    }
  };

  if (isLoading || !data) return <RevisionSkeleton />;

  const isEmpty = data.overdue.length + data.due_today.length + data.upcoming.length === 0;

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="mx-auto flex max-w-3xl flex-col gap-8">
      <motion.div variants={fadeUp}>
        <h1 className="font-serif text-3xl font-medium tracking-tight">Revision</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Spaced repetition keeps completed lessons from fading — reviews land at 1, 3, 7, 14, and 30 days.
        </p>
      </motion.div>

      {isEmpty && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-dashed border-border p-10 text-center">
          <CalendarClock className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Nothing due yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete a lesson to start its revision schedule.
          </p>
        </motion.div>
      )}

      {data.overdue.length > 0 && (
        <RevisionSection courseId={courseId} title="Overdue" tone="amber" items={data.overdue} onRate={rate} />
      )}
      {data.due_today.length > 0 && (
        <RevisionSection courseId={courseId} title="Due today" tone="indigo" items={data.due_today} onRate={rate} />
      )}
      {data.upcoming.length > 0 && (
        <RevisionSection courseId={courseId} title="Upcoming" tone="muted" items={data.upcoming} onRate={rate} />
      )}
    </motion.div>
  );
}

function RevisionSection({
  courseId,
  title,
  tone,
  items,
  onRate,
}: {
  courseId: string;
  title: string;
  tone: "amber" | "indigo" | "muted";
  items: RevisionItem[];
  onRate: (item: RevisionItem, success: boolean) => void;
}) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="outline" className="text-[0.65rem]">{items.length}</Badge>
      </div>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.schedule_id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, scale: 0.97 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <Link
                  href={`/dashboard/${courseId}/lessons/${item.lesson_slug}`}
                  className="truncate text-sm font-medium hover:text-brand-indigo"
                >
                  {item.lesson_title}
                </Link>
                <span className="text-xs text-muted-foreground">{item.module_title}</span>
                <div className="mt-1 flex items-center gap-1">
                  {Array.from({ length: item.stage_count }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 w-5 rounded-full",
                        i <= item.stage ? "bg-brand-indigo" : "bg-muted"
                      )}
                    />
                  ))}
                  {item.stage === item.stage_count - 1 && (
                    <Sparkles className="ml-1 size-3 text-brand-purple" />
                  )}
                </div>
              </div>

              <div className={cn("flex items-center gap-1", tone === "amber" && "text-brand-amber")}>
                <Button size="icon" variant="outline" className="size-9 rounded-full" onClick={() => onRate(item, false)} aria-label="Need more practice">
                  <X className="size-4 text-destructive" />
                </Button>
                <Button size="icon" className="size-9 rounded-full" onClick={() => onRate(item, true)} aria-label="Got it">
                  <Check className="size-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function RevisionSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Skeleton className="h-9 w-40" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}
