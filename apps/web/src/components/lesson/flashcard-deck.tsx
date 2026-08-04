"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FlashcardData } from "@/lib/api";

export function FlashcardDeck({ cards }: { cards: FlashcardData[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground">No flashcards yet.</p>;
  }

  const card = cards[index];

  const go = (delta: number) => {
    setFlipped(false);
    setIndex((i) => (i + delta + cards.length) % cards.length);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="capitalize">{card.card_type.replace("_", " ")}</Badge>
        <span className="text-xs text-muted-foreground">
          {index + 1} / {cards.length}
        </span>
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

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => go(-1)} className="rounded-full">
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="secondary" onClick={() => setFlipped((f) => !f)} className="gap-1.5">
          <RotateCw className="size-3.5" />
          Flip
        </Button>
        <Button variant="outline" size="icon" onClick={() => go(1)} className="rounded-full">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
