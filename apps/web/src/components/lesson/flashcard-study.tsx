"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, type FlashcardData } from "@/lib/api";
import { cn } from "@/lib/utils";

type Quality = "again" | "hard" | "good" | "easy";

const RATINGS: { value: Quality; label: string; cls: string }[] = [
  { value: "again", label: "Again", cls: "border-destructive/30 text-destructive hover:bg-destructive/5" },
  { value: "hard", label: "Hard", cls: "border-brand-amber/30 text-brand-amber hover:bg-brand-amber/5" },
  { value: "good", label: "Good", cls: "border-brand-electric/30 text-brand-electric hover:bg-brand-electric/5" },
  { value: "easy", label: "Easy", cls: "border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/5" },
];

export function FlashcardStudySession({ cards }: { cards: FlashcardData[] }) {
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground">No flashcards in this lesson yet.</p>;
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center">
        <PartyPopper className="size-6 text-brand-emerald" />
        <p className="text-sm font-semibold">Session complete</p>
        <p className="text-xs text-muted-foreground">Reviewed {reviewed} card{reviewed === 1 ? "" : "s"}.</p>
      </div>
    );
  }

  const card = queue[0];

  const rate = async (quality: Quality) => {
    setSubmitting(true);
    try {
      await api.post(`/flashcards/${card.id}/review`, { quality });
      setReviewed((r) => r + 1);
      setFlipped(false);
      setQueue((q) => q.slice(1));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="capitalize">{card.card_type.replace("_", " ")}</Badge>
        <span className="text-xs text-muted-foreground">{queue.length} remaining</span>
      </div>

      <div className="relative h-64 w-full max-w-md [perspective:1200px]">
        <AnimatePresence mode="wait">
          <motion.button
            key={card.id}
            type="button"
            onClick={() => setFlipped((f) => !f)}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full w-full"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center rounded-3xl border border-border bg-card p-8 text-center shadow-float"
                style={{ backfaceVisibility: "hidden" }}
              >
                <p className="text-lg font-medium leading-snug">{card.front}</p>
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center rounded-3xl border border-brand-indigo/30 bg-accent/60 p-8 text-center shadow-float"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <p className="text-base leading-relaxed text-foreground/90">{card.back}</p>
              </div>
            </motion.div>
          </motion.button>
        </AnimatePresence>
      </div>

      {!flipped ? (
        <Button variant="secondary" onClick={() => setFlipped(true)}>
          Show answer
        </Button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <Button
              key={r.value}
              variant="outline"
              disabled={submitting}
              onClick={() => rate(r.value)}
              className={cn("rounded-full", r.cls)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
