"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Eye, BookOpen, Hammer, Shuffle, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { GradientMesh } from "@/components/brand/gradient-mesh";
import { ThemeToggle } from "@/components/theme-toggle";
import { OptionCard } from "@/components/onboarding/option-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type DifficultyPreference, type LearningStyle, type UserProfile } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";

const LEARNING_STYLES: { value: LearningStyle; title: string; icon: React.ReactNode }[] = [
  { value: "visual", title: "Visual", icon: <Eye className="size-5" /> },
  { value: "reading", title: "Reading", icon: <BookOpen className="size-5" /> },
  { value: "practical", title: "Practical", icon: <Hammer className="size-5" /> },
  { value: "mixed", title: "Mixed", icon: <Shuffle className="size-5" /> },
];

const DIFFICULTIES: { value: DifficultyPreference; title: string }[] = [
  { value: "beginner", title: "Beginner" },
  { value: "intermediate", title: "Intermediate" },
  { value: "exam_mode", title: "Exam Mode" },
];

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<UserProfile>("/onboarding/me"),
  });

  const [form, setForm] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  if (user && !form) setForm(user);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await api.put("/onboarding/profile", {
        name: form.name,
        school: form.school,
        course_name: form.course_name,
        degree: form.degree,
        semester: form.semester,
        subjects: form.subjects ?? [],
        learning_style: form.learning_style,
        difficulty_preference: form.difficulty_preference,
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Settings saved");
    } catch {
      toast.error("Couldn't save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <GradientMesh />
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pb-16">
        {isLoading || !form ? (
          <SettingsSkeleton />
        ) : (
          <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="flex flex-col gap-8">
            <motion.div variants={fadeUp}>
              <h1 className="font-serif text-3xl font-medium tracking-tight">Settings</h1>
              <p className="mt-2 text-sm text-muted-foreground">{form.email}</p>
            </motion.div>

            <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="school">School / University</Label>
                <Input id="school" value={form.school ?? ""} onChange={(e) => setForm({ ...form, school: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="degree">Degree</Label>
                <Input id="degree" value={form.degree ?? ""} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="course">Course</Label>
                <Input id="course" value={form.course_name ?? ""} onChange={(e) => setForm({ ...form, course_name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="semester">Semester</Label>
                <Input id="semester" value={form.semester ?? ""} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Label className="mb-3">Preferred learning style</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {LEARNING_STYLES.map((style) => (
                  <OptionCard
                    key={style.value}
                    selected={form.learning_style === style.value}
                    onClick={() => setForm({ ...form, learning_style: style.value })}
                    icon={style.icon}
                    title={style.title}
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
                    selected={form.difficulty_preference === d.value}
                    onClick={() => setForm({ ...form, difficulty_preference: d.value })}
                    title={d.title}
                  />
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-center justify-between border-t border-border pt-6">
              <Button variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => toast.info("You're using local dev auth", { description: "Configure Clerk to enable real sign-out." })}>
                <LogOut className="size-4" />
                Sign out
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
