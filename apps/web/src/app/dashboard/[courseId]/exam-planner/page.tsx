"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CalendarDays, Sparkles, CheckCircle2, RotateCcw, Coffee, GraduationCap, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type ExamPlan } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function ExamPlannerPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ["exam-plan", courseId],
    queryFn: () => api.get<ExamPlan>(`/courses/${courseId}/exam-plan`),
  });

  const [editing, setEditing] = useState(false);

  if (isLoading || !plan) return <PlannerSkeleton />;

  if (!plan.exam_date || editing) {
    return (
      <PlannerForm
        courseId={courseId}
        plan={plan}
        onSaved={() => {
          setEditing(false);
          queryClient.invalidateQueries({ queryKey: ["exam-plan", courseId] });
        }}
      />
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="mx-auto flex max-w-3xl flex-col gap-8">
      <motion.div variants={fadeUp} className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Exam Planner</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Exam on {new Date(plan.exam_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            {plan.target_grade && ` · Target: ${plan.target_grade}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-xs">
          <p className="text-2xl font-semibold tabular-nums">{plan.days_until_exam}</p>
          <p className="mt-1 text-xs text-muted-foreground">Days remaining</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-xs">
          <p className="text-2xl font-semibold tabular-nums">{plan.lessons_remaining}</p>
          <p className="mt-1 text-xs text-muted-foreground">Lessons left</p>
        </div>
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border p-5 text-center shadow-xs",
            plan.on_track ? "border-brand-emerald/30 bg-brand-emerald/5" : "border-brand-amber/30 bg-brand-amber/5"
          )}
        >
          <p className={cn("text-sm font-semibold", plan.on_track ? "text-brand-emerald" : "text-brand-amber")}>
            {plan.on_track ? "On track" : "Falling behind"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.daily_study_minutes}m/day
          </p>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        <h2 className="mb-1 text-sm font-semibold">Your schedule</h2>
        {plan.schedule.map((day) => (
          <div
            key={day.day}
            className={cn(
              "rounded-2xl border p-4",
              day.is_mock_test_day
                ? "border-brand-purple/30 bg-brand-purple/5"
                : day.is_buffer_day
                  ? "border-border bg-muted/30"
                  : "border-border bg-card"
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                {new Date(day.day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </span>
              {day.is_mock_test_day && (
                <Badge variant="outline" className="gap-1 border-brand-purple/30 text-brand-purple">
                  <GraduationCap className="size-3" />
                  Exam day
                </Badge>
              )}
              {day.is_buffer_day && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Coffee className="size-3" />
                  Buffer
                </Badge>
              )}
            </div>
            {day.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {day.is_mock_test_day ? "Take a full mock test." : day.is_buffer_day ? "Rest, or catch up if you're behind." : "Nothing scheduled."}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {day.items.map((item) => (
                  <li key={item.lesson_id} className="flex items-center gap-2 text-sm">
                    {item.kind === "revision" ? (
                      <RotateCcw className="size-3.5 shrink-0 text-brand-amber" />
                    ) : (
                      <CheckCircle2 className="size-3.5 shrink-0 text-brand-indigo" />
                    )}
                    <span className="truncate">{item.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{item.estimated_minutes}m</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function PlannerForm({
  courseId,
  plan,
  onSaved,
}: {
  courseId: string;
  plan: ExamPlan;
  onSaved: () => void;
}) {
  const [examDate, setExamDate] = useState(plan.exam_date ?? "");
  const [targetGrade, setTargetGrade] = useState(plan.target_grade ?? "");
  const [dailyMinutes, setDailyMinutes] = useState(plan.daily_study_minutes ?? 60);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!examDate) return;
    setSaving(true);
    try {
      await api.put(`/courses/${courseId}/exam-plan`, {
        exam_date: examDate,
        target_grade: targetGrade || null,
        daily_study_minutes: dailyMinutes,
      });
      toast.success("Study plan generated");
      onSaved();
    } catch {
      toast.error("Couldn't generate your plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="mx-auto flex max-w-md flex-col gap-8 py-10">
      <motion.div variants={fadeUp} className="text-center">
        <Sparkles className="mx-auto size-6 text-brand-purple" />
        <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight">Plan for your exam</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us when and how much you can study — we&rsquo;ll build a day-by-day schedule that prioritizes weak topics and leaves buffer time before the exam.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exam-date">Exam date</Label>
          <Input id="exam-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-grade">Target grade (optional)</Label>
          <Input id="target-grade" placeholder="A / First Class / 90%" value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="daily-minutes">Daily study time (minutes)</Label>
          <Input
            id="daily-minutes"
            type="number"
            min={15}
            step={15}
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Button className="w-full" size="lg" disabled={!examDate || saving} onClick={save}>
          {saving ? "Building your schedule…" : "Generate study plan"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

function PlannerSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
