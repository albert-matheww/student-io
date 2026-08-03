"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  PlaySquare,
  Link2,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { api } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface UploadItem {
  id: string;
  name: string;
  kind: "file" | "link";
  status: "uploading" | "uploaded" | "failed";
}

const ACCEPTED_TYPES =
  ".pdf,.ppt,.pptx,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg,.heic,.mp3,.wav,.m4a,.mp4,.mov";

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "heic"].includes(ext)) return ImageIcon;
  if (["mp3", "wav", "m4a"].includes(ext)) return Music;
  if (["mp4", "mov"].includes(ext)) return Video;
  return FileText;
}

export default function UploadResourcesPage() {
  const router = useRouter();
  const store = useOnboardingStore();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [linkDraft, setLinkDraft] = useState("");
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!store.courseId) {
      router.replace("/onboarding/syllabus");
    }
  }, [store.courseId, router]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!store.courseId) return;
      const id = `${file.name}-${Date.now()}`;
      setItems((prev) => [{ id, name: file.name, kind: "file", status: "uploading" }, ...prev]);

      const form = new FormData();
      form.append("file", file);
      try {
        await api.postForm(`/onboarding/courses/${store.courseId}/resources`, form);
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "uploaded" } : i)));
      } catch {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "failed" } : i)));
        toast.error(`Couldn't upload ${file.name}`);
      }
    },
    [store.courseId]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      accepted.forEach(uploadFile);
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const addLink = () => {
    const value = linkDraft.trim();
    if (!value) return;
    const id = `${value}-${Date.now()}`;
    setItems((prev) => [{ id, name: value, kind: "link", status: "uploaded" }, ...prev]);
    setLinkDraft("");
    toast.success("Link queued for processing", {
      description: "Transcripts and key timestamps will be extracted automatically.",
    });
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await api.post("/onboarding/complete");
      router.push(`/dashboard/${store.courseId}`);
    } catch {
      toast.error("Couldn't finish setup", {
        description: "Check that the API server is running on localhost:8000.",
      });
    } finally {
      setFinishing(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="flex flex-col gap-8">
      <motion.div variants={fadeUp}>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-balance">
          Upload your learning resources
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lecture slides, notes, recordings, past papers — Student.io reads all of it and fills in
          your course. You can always add more later.
        </p>
      </motion.div>

      <motion.div variants={fadeUp}>
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
            isDragActive ? "border-brand-indigo bg-accent/50" : "border-border hover:border-brand-indigo/50 hover:bg-accent/20"
          )}
        >
          <input {...getInputProps()} accept={ACCEPTED_TYPES} />
          <motion.div
            animate={{ y: isDragActive ? -6 : 0, scale: isDragActive ? 1.06 : 1 }}
            className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-indigo to-brand-electric text-primary-foreground shadow-glow"
          >
            <UploadCloud className="size-6" />
          </motion.div>
          <div>
            <p className="text-sm font-semibold">Drag & drop files, or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, PPT, DOCX, TXT, ZIP, PNG, JPEG, HEIC, MP3, MP4, MOV
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex gap-2">
        <div className="relative flex-1">
          <PlaySquare className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Paste a YouTube, Google Drive, or OneDrive link"
            value={linkDraft}
            className="pl-9"
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLink()}
          />
        </div>
        <Button type="button" variant="secondary" onClick={addLink}>
          <Link2 className="size-4" />
          Add
        </Button>
      </motion.div>

      {items.length > 0 && (
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const Icon = item.kind === "link" ? Link2 : iconFor(item.name);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-3.5 py-2.5"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{item.name}</span>
                  {item.status === "uploading" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  {item.status === "uploaded" && <CheckCircle2 className="size-4 text-brand-emerald" />}
                  {item.status === "failed" && <span className="text-xs text-destructive">Failed</span>}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground/60 hover:text-foreground"
                    aria-label="Remove"
                  >
                    <X className="size-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">
          {items.length === 0
            ? "You can skip this and add resources anytime from your library."
            : `${items.length} resource${items.length === 1 ? "" : "s"} added`}
        </span>
        <Button size="lg" disabled={finishing} onClick={handleFinish} className="px-8">
          {finishing ? "Finishing…" : "Go to my dashboard"}
          <ArrowRight className="size-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
