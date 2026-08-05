"use client";

import { Flame, Bell } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, type DashboardStats } from "@/lib/api";

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function Topbar() {
  const params = useParams<{ courseId?: string }>();
  const courseId = params?.courseId;

  const { data } = useQuery({
    queryKey: ["dashboard", courseId],
    queryFn: () => api.get<DashboardStats>(`/courses/${courseId}/dashboard`),
    enabled: Boolean(courseId),
  });

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-brand-amber/10 px-3 py-1.5 text-sm font-semibold text-brand-amber">
          <Flame className="size-4" />
          {data?.study_streak ?? 0}
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="size-4" />
        </Button>
        <ThemeToggle />
        {HAS_CLERK ? (
          <UserButton signInUrl="/sign-in" />
        ) : (
          <Avatar className="size-8">
            <AvatarFallback className="bg-brand-indigo text-primary-foreground text-xs font-semibold">
              ST
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
}
