"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, type TutorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "Explain this simply, like I'm new to the topic",
  "Give me a real-world analogy",
  "What are common mistakes here?",
];

export function AskAiPanel({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const { data: history } = useQuery({
    queryKey: ["tutor-messages", lessonId],
    queryFn: () => api.get<TutorMessage[]>(`/lessons/${lessonId}/messages`),
  });

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  if (messages === null && history) {
    setMessages(history.map((m) => ({ role: m.role, text: m.content })));
  }
  const shown = messages ?? [];

  const send = async (question: string) => {
    const text = question.trim();
    if (!text || loading) return;
    setMessages((prev) => [...(prev ?? []), { role: "user", text }]);
    setDraft("");
    setLoading(true);
    try {
      const res = await api.post<{ answer: string }>(`/lessons/${lessonId}/ask`, { question: text });
      setMessages((prev) => [...(prev ?? []), { role: "assistant", text: res.answer }]);
    } catch {
      setMessages((prev) => [
        ...(prev ?? []),
        { role: "assistant", text: "Something went wrong reaching the tutor — check the API server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {shown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-5 text-center">
          <Sparkles className="mx-auto size-5 text-brand-purple" />
          <p className="mt-2 text-sm font-medium">Ask your AI tutor about {lessonTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            It remembers this lesson&rsquo;s context and adapts to what you already know.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand-indigo/40 hover:bg-accent/40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {shown.length > 0 && (
        <div className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
          <BrainCircuit className="size-3" />
          Remembers this conversation across sessions
        </div>
      )}

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {shown.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-brand-indigo text-primary-foreground"
                    : "border border-border bg-card"
                )}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          placeholder="I don't understand recursion…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={1}
          className="min-h-10 resize-none"
        />
        <Button size="icon" onClick={() => send(draft)} disabled={loading} className="shrink-0">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
