"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api, type QuizAttemptResult, type QuizQuestionData } from "@/lib/api";
import { toastNewAchievements } from "@/lib/achievements";

export function QuizPanel({ questions }: { questions: QuizQuestionData[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">No quiz questions yet.</p>;
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;

  const submit = async (answer: string) => {
    if (result) return;
    setSelected(answer);
    setSubmitting(true);
    try {
      const res = await api.post<QuizAttemptResult>(`/questions/${question.id}/attempts`, { answer });
      setResult(res);
      setScore((s) => ({ correct: s.correct + (res.is_correct ? 1 : 0), total: s.total + 1 }));
      toastNewAchievements(res.new_achievements);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    setSelected(null);
    setResult(null);
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  };

  const options = question.options ?? (question.question_type === "true_false" ? ["True", "False"] : []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="capitalize">{question.difficulty}</Badge>
        <span className="text-xs text-muted-foreground">
          Question {index + 1} / {questions.length} · {score.correct}/{score.total} correct
        </span>
      </div>

      <p className="text-base font-medium leading-relaxed">{question.prompt}</p>

      <div className="flex flex-col gap-2.5">
        {options.map((option) => {
          const isSelected = selected === option;
          const isCorrectAnswer = result && option.toLowerCase() === result.correct_answer.toLowerCase();
          return (
            <button
              key={option}
              disabled={Boolean(result) || submitting}
              onClick={() => submit(option)}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                !result && "hover:border-brand-indigo/50 hover:bg-accent/40",
                !result && "border-border",
                result && isCorrectAnswer && "border-brand-emerald/40 bg-brand-emerald/10",
                result && isSelected && !isCorrectAnswer && "border-destructive/40 bg-destructive/10",
                result && !isSelected && !isCorrectAnswer && "border-border opacity-60"
              )}
            >
              {option}
              {result && isCorrectAnswer && <CheckCircle2 className="size-4 text-brand-emerald" />}
              {result && isSelected && !isCorrectAnswer && <XCircle className="size-4 text-destructive" />}
            </button>
          );
        })}
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-2xl border p-4 text-sm",
            result.is_correct ? "border-brand-emerald/30 bg-brand-emerald/5" : "border-destructive/30 bg-destructive/5"
          )}
        >
          <p className="font-semibold">{result.is_correct ? "Correct!" : "Not quite"}</p>
          {result.explanation && <p className="mt-1 text-foreground/80">{result.explanation}</p>}
        </motion.div>
      )}

      <div className="flex justify-end">
        {result && !isLast && (
          <Button onClick={next}>Next question</Button>
        )}
        {result && isLast && (
          <Badge className="bg-brand-emerald/15 text-brand-emerald">
            Quiz complete — {score.correct}/{score.total}
          </Badge>
        )}
      </div>
    </div>
  );
}
