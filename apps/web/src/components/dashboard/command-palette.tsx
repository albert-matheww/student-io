"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Layers, ListChecks, FileText } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { api, type SearchResultOut } from "@/lib/api";

const KIND_META = {
  lesson: { label: "Lessons", icon: BookOpen, tab: null },
  flashcard: { label: "Flashcards", icon: Layers, tab: "flashcards" },
  quiz: { label: "Quiz questions", icon: ListChecks, tab: "quiz" },
  resource: { label: "Library", icon: FileText, tab: null },
} as const;

export function CommandPalette() {
  const { open, setOpen, toggle } = useCommandPaletteStore();
  const params = useParams<{ courseId?: string }>();
  const courseId = params?.courseId;
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  const { data } = useQuery({
    queryKey: ["search", courseId, query],
    queryFn: () => api.get<{ results: SearchResultOut[] }>(`/courses/${courseId}/search?q=${encodeURIComponent(query)}`),
    enabled: Boolean(courseId) && query.trim().length >= 2,
  });

  const results = data?.results ?? [];
  const grouped = results.reduce<Record<string, SearchResultOut[]>>((acc, r) => {
    (acc[r.kind] ??= []).push(r);
    return acc;
  }, {});

  const select = (result: SearchResultOut) => {
    setOpen(false);
    setQuery("");
    if (result.kind === "resource") {
      router.push(`/dashboard/${courseId}/library`);
      return;
    }
    const meta = KIND_META[result.kind as keyof typeof KIND_META];
    const suffix = meta.tab ? `?tab=${meta.tab}` : "";
    router.push(`/dashboard/${courseId}/lessons/${result.lesson_slug}${suffix}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search this course">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search lessons, flashcards, quizzes, resources…" value={query} onValueChange={setQuery} />
        <CommandList>
          {query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>
          )}
          {query.trim().length < 2 && (
            <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
          )}
          {Object.entries(grouped).map(([kind, items]) => {
            const meta = KIND_META[kind as keyof typeof KIND_META];
            const Icon = meta.icon;
            return (
              <CommandGroup key={kind} heading={meta.label}>
                {items.map((item) => (
                  <CommandItem key={`${item.kind}-${item.id}`} onSelect={() => select(item)}>
                    <Icon className="size-4" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
