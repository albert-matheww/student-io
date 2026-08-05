"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, BookOpenCheck, Brain, Target, AlertCircle, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from "recharts";
import { StatCard } from "@/components/dashboard/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap";
import { api, type Analytics } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function AnalyticsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", courseId],
    queryFn: () => api.get<Analytics>(`/courses/${courseId}/analytics`),
  });

  const weeklyTrend = useMemo(() => {
    if (!data) return [];
    const weeks: { week: string; activity: number }[] = [];
    for (let i = 0; i < data.daily_activity.length; i += 7) {
      const chunk = data.daily_activity.slice(i, i + 7);
      const total = chunk.reduce((sum, d) => sum + d.count, 0);
      weeks.push({ week: chunk[0]?.day.slice(5) ?? "", activity: total });
    }
    return weeks;
  }, [data]);

  if (isLoading || !data) return <AnalyticsSkeleton />;

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="mx-auto flex max-w-5xl flex-col gap-8">
      <motion.div variants={fadeUp}>
        <h1 className="font-serif text-3xl font-medium tracking-tight">Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">How your understanding is actually building up.</p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={<Clock className="size-5" />} label="Hours studied" value={`${data.hours_studied}h`} tone="indigo" />
        <StatCard icon={<BookOpenCheck className="size-5" />} label="Topics learned" value={`${data.topics_learned}`} tone="emerald" />
        <StatCard icon={<Brain className="size-5" />} label="Retention" value={`${data.retention_percent}%`} tone="purple" />
        <StatCard icon={<Target className="size-5" />} label="Quiz accuracy" value={`${data.quiz_accuracy}%`} tone="electric" />
        <StatCard icon={<TrendingUp className="size-5" />} label="Exam readiness" value={`${data.exam_readiness}%`} tone="amber" />
        <StatCard icon={<AlertCircle className="size-5" />} label="Weak areas" value={`${data.weak_area_count}`} tone="amber" />
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold">Weekly activity</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyTrend} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-indigo)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--brand-indigo)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <RechartsTooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="activity" stroke="var(--brand-indigo)" strokeWidth={2} fill="url(#activityFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold">Daily activity</h2>
        <ActivityHeatmap days={data.daily_activity} />
      </motion.div>
    </motion.div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Skeleton className="h-9 w-40" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
