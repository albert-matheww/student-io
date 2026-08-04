"use client";

import { Trophy, Lock, Flame } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { GamificationSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AchievementsDialog({
  open,
  onOpenChange,
  summary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary?: GamificationSummary;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="size-4 text-brand-amber" />
            Level {summary?.level ?? 1}
          </DialogTitle>
          <DialogDescription>
            {summary ? `${summary.xp_into_level} / ${summary.xp_for_next_level} XP to next level` : "Loading…"}
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <>
            <Progress value={(summary.xp_into_level / summary.xp_for_next_level) * 100} className="h-2" />

            <div className="flex items-center gap-1.5 text-sm text-brand-amber">
              <Flame className="size-4" />
              {summary.current_streak}-day streak
              <span className="text-xs text-muted-foreground">(best {summary.longest_streak})</span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {summary.achievements.map((a) => (
                <div
                  key={a.code}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-3",
                    a.earned
                      ? "border-brand-amber/30 bg-brand-amber/5"
                      : "border-border bg-muted/30 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {a.earned ? (
                      <Trophy className="size-3.5 text-brand-amber" />
                    ) : (
                      <Lock className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-semibold">{a.title}</span>
                  </div>
                  <span className="text-[0.7rem] leading-snug text-muted-foreground">{a.description}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
