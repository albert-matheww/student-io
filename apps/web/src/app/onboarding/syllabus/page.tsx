"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, FileText, Type, Link2, UploadCloud, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptionCard } from "@/components/onboarding/option-card";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { api, type CourseDetail } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25 },
};

type Method = "paste" | "type" | "upload" | "website";

const METHODS: { value: Method; title: string; description: string; icon: React.ReactNode }[] = [
  { value: "paste", title: "Paste Text", description: "Paste your syllabus content directly", icon: <Type className="size-5" /> },
  { value: "type", title: "Just the Subject Name", description: "We'll generate a standard outline", icon: <Sparkles className="size-5" /> },
  { value: "upload", title: "Upload PDF / DOCX / PPT", description: "We'll extract units & topics", icon: <UploadCloud className="size-5" /> },
  { value: "website", title: "University Website", description: "Link your official course page", icon: <Link2 className="size-5" /> },
];

export default function SyllabusPage() {
  const router = useRouter();
  const store = useOnboardingStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [method, setMethod] = useState<Method>("type");
  const [courseName, setCourseName] = useState(store.courseName);
  const [rawText, setRawText] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);

  const canContinue = courseName.trim().length > 0 && (method !== "paste" || rawText.trim().length > 0);

  const handleContinue = async () => {
    if (!canContinue) return;
    setGenerating(true);
    try {
      let syllabusText: string | null = null;
      if (method === "paste") syllabusText = rawText;
      if (method === "website" && websiteUrl) {
        syllabusText = `Course syllabus is published at: ${websiteUrl}. Generate the standard outline for this course based on its name until live page import is enabled.`;
      }
      if (method === "upload" && file?.type === "text/plain") {
        syllabusText = await file.text();
      }

      const course = await api.post<CourseDetail>("/onboarding/syllabus", {
        course_name: courseName,
        raw_text: syllabusText,
        learning_mode: "guided",
      });

      if (method === "upload" && file && file.type !== "text/plain") {
        const form = new FormData();
        form.append("file", file);
        await api.postForm(`/onboarding/courses/${course.id}/resources`, form).catch(() => {
          toast.warning("Syllabus file will finish processing in the background.");
        });
      }

      store.setProfile({ courseName });
      store.setCourse(course.id, course.name);
      toast.success(`${course.modules.length} module${course.modules.length === 1 ? "" : "s"} generated`, {
        description: "Add your lecture materials next so we can build out every lesson.",
      });
      router.push("/onboarding/upload");
    } catch {
      toast.error("Couldn't generate your course outline", {
        description: "Check that the API server is running on localhost:8000.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="flex flex-col gap-8">
      <motion.div variants={fadeUp}>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-balance">
          How would you like to add your syllabus?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Student.io extracts units, topics, learning objectives, and estimated study hours automatically.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
        {METHODS.map((m) => (
          <OptionCard
            key={m.value}
            selected={method === m.value}
            onClick={() => setMethod(m.value)}
            icon={m.icon}
            title={m.title}
            description={m.description}
          />
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-name">Subject / course name</Label>
          <Input
            id="course-name"
            placeholder="Computer Networks"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            autoFocus
          />
        </div>

        <AnimatePresence mode="wait">
          {method === "paste" && (
            <motion.div key="paste" {...panelMotion} className="flex flex-col gap-1.5">
              <Label htmlFor="raw-text">Syllabus content</Label>
              <Textarea
                id="raw-text"
                rows={7}
                placeholder="Unit 1: Introduction to Networking&#10;Unit 2: OSI & TCP/IP models&#10;..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            </motion.div>
          )}

          {method === "upload" && (
            <motion.div key="upload" {...panelMotion}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.ppt,.pptx,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
                  file ? "border-brand-indigo bg-accent/40" : "border-border hover:border-brand-indigo/50 hover:bg-accent/20"
                )}
              >
                <FileText className="size-6 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {file ? file.name : "Click to choose your syllabus file"}
                </span>
                <span className="text-xs text-muted-foreground">PDF, DOCX, PPT, or TXT</span>
              </button>
            </motion.div>
          )}

          {method === "website" && (
            <motion.div key="website" {...panelMotion} className="flex flex-col gap-1.5">
              <Label htmlFor="website-url">University course page URL</Label>
              <Input
                id="website-url"
                placeholder="https://university.edu/cs301/syllabus"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div variants={fadeUp} className="flex justify-end pt-2">
        <Button size="lg" disabled={!canContinue || generating} onClick={handleContinue} className="px-8">
          {generating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating outline…
            </>
          ) : (
            <>
              Generate Course
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
