"use client";

import { use, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Archive,
  Link2,
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Library as LibraryIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type ResourceOut } from "@/lib/api";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  ppt: FileText,
  txt: FileText,
  image: ImageIcon,
  audio: Music,
  video: Video,
  youtube: Video,
  drive_link: Link2,
};

const STATUS_STYLE: Record<string, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  uploaded: { icon: Loader2, cls: "text-muted-foreground", label: "Queued" },
  processing: { icon: Loader2, cls: "text-brand-electric", label: "Processing" },
  processed: { icon: CheckCircle2, cls: "text-brand-emerald", label: "Ready" },
  failed: { icon: AlertTriangle, cls: "text-destructive", label: "Failed" },
};

export default function LibraryPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["resources", courseId],
    queryFn: () => api.get<ResourceOut[]>(`/courses/${courseId}/resources`),
  });

  const uploadFile = useCallback(
    async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      try {
        await api.postForm(`/onboarding/courses/${courseId}/resources`, form);
        queryClient.invalidateQueries({ queryKey: ["resources", courseId] });
        toast.success(`${file.name} added to your library`);
      } catch {
        toast.error(`Couldn't upload ${file.name}`);
      }
    },
    [courseId, queryClient]
  );

  const onDrop = useCallback((accepted: File[]) => accepted.forEach(uploadFile), [uploadFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (isLoading || !data) return <LibrarySkeleton />;

  const groups = data.reduce<Record<string, ResourceOut[]>>((acc, resource) => {
    (acc[resource.resource_type] ??= []).push(resource);
    return acc;
  }, {});

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer(0.06)} className="mx-auto flex max-w-4xl flex-col gap-8">
      <motion.div variants={fadeUp}>
        <h1 className="font-serif text-3xl font-medium tracking-tight">Library</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you&rsquo;ve uploaded for this course, organized automatically.
        </p>
      </motion.div>

      <motion.div variants={fadeUp}>
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
            isDragActive ? "border-brand-indigo bg-accent/50" : "border-border hover:border-brand-indigo/50 hover:bg-accent/20"
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="size-5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Drag & drop, or click to add another resource</p>
        </div>
      </motion.div>

      {data.length === 0 ? (
        <motion.div variants={fadeUp} className="rounded-2xl border border-dashed border-border p-10 text-center">
          <LibraryIcon className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Your library is empty</p>
          <p className="mt-1 text-xs text-muted-foreground">Upload lecture slides, notes, or recordings above.</p>
        </motion.div>
      ) : (
        Object.entries(groups).map(([type, resources]) => (
          <motion.div key={type} variants={fadeUp} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold capitalize">{type.replace("_", " ")}</h2>
            <div className="flex flex-col gap-2">
              {resources.map((resource) => {
                const Icon = TYPE_ICON[resource.resource_type] ?? Archive;
                const status = STATUS_STYLE[resource.status];
                const StatusIcon = status.icon;
                return (
                  <div
                    key={resource.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{resource.filename}</span>
                    <Badge variant="outline" className={cn("gap-1", status.cls)}>
                      <StatusIcon className={cn("size-3", resource.status !== "processed" && resource.status !== "failed" && "animate-spin")} />
                      {status.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-24 rounded-2xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}
