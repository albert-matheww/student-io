"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Library,
  Layers,
  ListChecks,
  RotateCcw,
  BarChart3,
  Search,
  Settings,
  Trophy,
  CalendarClock,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AchievementsDialog } from "@/components/dashboard/achievements-dialog";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { api, type GamificationSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams<{ courseId?: string }>();
  const courseId = params?.courseId ?? "";
  const setSearchOpen = useCommandPaletteStore((s) => s.setOpen);
  const [achievementsOpen, setAchievementsOpen] = useState(false);

  const { data: gamification } = useQuery({
    queryKey: ["gamification"],
    queryFn: () => api.get<GamificationSummary>("/gamification/summary"),
  });

  const nav = [
    { href: `/dashboard/${courseId}`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/dashboard/${courseId}/library`, label: "Library", icon: Library },
    { href: `/dashboard/${courseId}/flashcards`, label: "Flashcards", icon: Layers },
    { href: `/dashboard/${courseId}/quizzes`, label: "Quizzes", icon: ListChecks },
    { href: `/dashboard/${courseId}/revision`, label: "Revision", icon: RotateCcw },
    { href: `/dashboard/${courseId}/exam-planner`, label: "Exam Planner", icon: CalendarClock },
    { href: `/dashboard/${courseId}/analytics`, label: "Analytics", icon: BarChart3 },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-5 sm:flex">
      <div className="px-2">
        <Logo size={26} />
      </div>

      <button
        onClick={() => setSearchOpen(true)}
        className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-xs transition-colors hover:border-brand-indigo/40"
      >
        <Search className="size-4" />
        Search everything
        <kbd className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium">⌘K</kbd>
      </button>

      <nav className="mt-6 flex flex-1 flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-border pt-3">
        <button
          onClick={() => setAchievementsOpen(true)}
          className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-brand-amber/15 to-transparent px-3 py-2 text-sm font-medium text-brand-amber transition-colors hover:from-brand-amber/25"
        >
          <Trophy className="size-4" />
          {gamification ? `Level ${gamification.level} · ${gamification.xp.toLocaleString()} XP` : "Loading…"}
        </button>
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <Settings className="size-4" />
          Settings
        </Link>
      </div>

      <AchievementsDialog open={achievementsOpen} onOpenChange={setAchievementsOpen} summary={gamification} />
    </aside>
  );
}
