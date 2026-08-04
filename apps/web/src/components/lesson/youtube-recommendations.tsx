import { PlaySquare, Clock } from "lucide-react";
import type { RecommendedVideo } from "@/lib/api";

export function YoutubeRecommendations({ videos }: { videos: RecommendedVideo[] }) {
  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-4 text-center">
        <PlaySquare className="mx-auto size-4 text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">
          Connect a YOUTUBE_API_KEY in apps/api/.env to surface recommended videos for this topic.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">Recommended videos</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {videos.map((video) => (
          <a
            key={video.video_id}
            href={`https://www.youtube.com/watch?v=${video.video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-brand-indigo/40"
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={video.thumbnail_url} alt={video.title} className="aspect-video w-full object-cover" />
              {video.duration && (
                <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[0.65rem] font-medium text-white">
                  {video.duration}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 p-3">
              <p className="line-clamp-2 text-xs font-semibold leading-snug group-hover:text-brand-indigo">
                {video.title}
              </p>
              <p className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                <Clock className="size-3" />
                {video.channel}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
