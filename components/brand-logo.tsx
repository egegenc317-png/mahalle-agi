import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  markOnly?: boolean;
  size?: "md" | "lg";
};

export function BrandLogo({ className, markOnly = false, size = "md" }: BrandLogoProps) {
  const isLg = size === "lg";
  return (
    <div className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#f97316] via-[#f59e0b] to-[#facc15] shadow-md shadow-orange-300/40",
          isLg ? "h-12 w-12" : "h-10 w-10"
        )}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true" className={cn(isLg ? "h-8 w-8" : "h-7 w-7")}>
          <circle cx="45" cy="16" r="7" fill="#fde68a" />
          <path d="M6 42h52v16H6z" fill="#fff7ed" />
          <path d="M10 30l8-6 8 6v12H10z" fill="#fef3c7" />
          <path d="M26 26l8-7 8 7v16H26z" fill="#ffedd5" />
          <path d="M42 32l6-4 6 4v10H42z" fill="#fed7aa" />
          <path d="M30 35h4v7h-4zM14 34h3v4h-3zM19 34h3v4h-3zM46 35h3v4h-3z" fill="#b45309" />
          <path d="M6 46c9-3 18-3 27 0s18 3 25 0v12H6z" fill="#f59e0b" />
        </svg>
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-100/90" />
      </span>
      {!markOnly ? (
        <span className="min-w-0 leading-tight">
          <span className={cn("block truncate font-extrabold tracking-tight text-zinc-900", isLg ? "text-base" : "text-sm")}>Mahalle Ağı</span>
          <span className={cn("block truncate font-semibold uppercase tracking-[0.12em] text-orange-600", isLg ? "text-[11px]" : "text-[10px]")}>Sıcak Mahalle Ruhu</span>
        </span>
      ) : null}
    </div>
  );
}
