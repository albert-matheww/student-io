"use client";

import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DailyActivity } from "@/lib/api";
import { cn } from "@/lib/utils";

function levelFor(count: number) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

const LEVEL_CLS = [
  "bg-muted",
  "bg-brand-emerald/25",
  "bg-brand-emerald/50",
  "bg-brand-emerald/75",
  "bg-brand-emerald",
];

export function ActivityHeatmap({ days }: { days: DailyActivity[] }) {
  const weeks = useMemo(() => {
    const result: DailyActivity[][] = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [days]);

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day) => (
            <Tooltip key={day.day}>
              <TooltipTrigger asChild>
                <div
                  className={cn("size-3 rounded-[3px]", LEVEL_CLS[levelFor(day.count)])}
                />
              </TooltipTrigger>
              <TooltipContent>
                {day.count} {day.count === 1 ? "activity" : "activities"} ·{" "}
                {new Date(day.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );
}
