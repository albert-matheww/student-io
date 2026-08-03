import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 28,
  withWordmark = true,
}: {
  className?: string;
  size?: number;
  withWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="student-io-mark" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--brand-electric)" />
            <stop offset="1" stopColor="var(--brand-indigo)" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#student-io-mark)" />
        <path
          d="M9.5 20.5V12.8c0-.44.36-.8.8-.8h11.4c.44 0 .8.36.8.8v7.7"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
        <path
          d="M16 9 6 13.2l10 4.2 10-4.2L16 9Z"
          fill="white"
        />
        <path
          d="M9.8 15.6v4.6c0 .5.3.95.77 1.13 1.6.63 3.6.98 5.43.98s3.83-.35 5.43-.98a1.2 1.2 0 0 0 .77-1.13v-4.6"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark && (
        <span className="text-[1.15rem] font-semibold tracking-tight text-foreground">
          Student<span className="text-brand-indigo dark:text-brand-electric">.io</span>
        </span>
      )}
    </div>
  );
}
