"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Eye, BookOpen, Hammer, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionCard } from "@/components/onboarding/option-card";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { api, type DifficultyPreference, type LearningStyle } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";

const LEARNING_STYLES: { value: LearningStyle; title: string; description: string; icon: React.ReactNode }[] = [
  { value: "visual", title: "Visual", description: "Diagrams, mind maps, mnemonics", icon: <Eye className="size-5" /> },
  { value: "reading", title: "Reading", description: "Structured notes & definitions", icon: <BookOpen className="size-5" /> },
  { value: "practical", title: "Practical", description: "Examples & hands-on practice", icon: <Hammer className="size-5" /> },
  { value: "mixed", title: "Mixed", description: "A blend of everything", icon: <Shuffle className="size-5" /> },
];

const DIFFICULTIES: { value: DifficultyPreference; title: string; description: string }[] = [
  { value: "beginner", title: "Beginner", description: "Build from the fundamentals" },
  { value: "intermediate", title: "Intermediate", description: "I know the basics already" },
  { value: "exam_mode", title: "Exam Mode", description: "Focus on scoring well, fast" },
];

export default function ProfilePage() {
  const router = useRouter();
  const store = useOnboardingStore();
  const [subjectDraft, setSubjectDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addSubject = () => {
    const value = subjectDraft.trim();
    if (value && !store.subjects.includes(value)) {
      store.setProfile({ subjects: [...store.subjects, value] });
    }
    setSubjectDraft("");
  };

  const canContinue = store.name.trim().length > 0;

  const handleContinue = async () => {
    if (!canContinue) return;
    setSubmitting(true);
    try {
      await api.put("/onboarding/profile", {
        name: store.name,
        school: store.school || null,
        course_name: store.courseName || null,
        degree: store.degree || null,
        semester: store.semester || null,
        subjects: store.subjects,
        learning_style: store.learningStyle,
        difficulty_preference: store.difficultyPreference,
      });
      router.push("/onboarding/syllabus");
    } catch {
      toast.error("Couldn't save your profile", {
        description: "Check that the API server is running on localhost:8000.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="flex flex-col gap-8">
      <motion.div variants={fadeUp}>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-balance">
          Tell us about yourself
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This helps Student.io tailor explanations, pacing, and difficulty to you specifically.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            placeholder="Jordan Lee"
            value={store.name}
            onChange={(e) => store.setProfile({ name: e.target.value })}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="school">School / University</Label>
          <Input
            id="school"
            placeholder="Stanford University"
            value={store.school}
            onChange={(e) => store.setProfile({ school: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course">Course</Label>
          <Input
            id="course"
            placeholder="B.Tech Computer Science"
            value={store.courseName}
            onChange={(e) => store.setProfile({ courseName: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="degree">Degree</Label>
          <Input
            id="degree"
            placeholder="Bachelor's"
            value={store.degree}
            onChange={(e) => store.setProfile({ degree: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="semester">Semester</Label>
          <Input
            id="semester"
            placeholder="5th"
            value={store.semester}
            onChange={(e) => store.setProfile({ semester: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="subjects">Subjects</Label>
          <div className="flex gap-2">
            <Input
              id="subjects"
              placeholder="e.g. Computer Networks — press Enter to add"
              value={subjectDraft}
              onChange={(e) => setSubjectDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubject();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addSubject}>
              Add
            </Button>
          </div>
          {store.subjects.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {store.subjects.map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                >
                  {subject}
                  <button
                    type="button"
                    onClick={() =>
                      store.setProfile({ subjects: store.subjects.filter((s) => s !== subject) })
                    }
                    className="text-accent-foreground/60 hover:text-accent-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Label className="mb-3">Preferred learning style</Label>
        <div className="grid grid-cols-2 gap-3">
          {LEARNING_STYLES.map((style) => (
            <OptionCard
              key={style.value}
              selected={store.learningStyle === style.value}
              onClick={() => store.setProfile({ learningStyle: style.value })}
              icon={style.icon}
              title={style.title}
              description={style.description}
            />
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Label className="mb-3">Difficulty preference</Label>
        <div className="grid grid-cols-3 gap-3">
          {DIFFICULTIES.map((d) => (
            <OptionCard
              key={d.value}
              selected={store.difficultyPreference === d.value}
              onClick={() => store.setProfile({ difficultyPreference: d.value })}
              title={d.title}
              description={d.description}
            />
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex justify-end pt-2">
        <Button size="lg" disabled={!canContinue || submitting} onClick={handleContinue} className="px-8">
          {submitting ? "Saving…" : "Continue"}
          <ArrowRight className="size-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
