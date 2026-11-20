import { BookOpen, BookOpenCheck, Landmark, Target, type LucideIcon } from "lucide-react";
import { initials } from "@/components/uploads/avatar-upload";
import type { PublicTrainingCard } from "@/lib/api/schemas/catalog";
import { cn } from "@/lib/cn";

/** Seeded categories keep the landing page icons; admin-added ones get a neutral book. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "professional-exam": Landmark,
  "university-course": BookOpenCheck,
  "specific-topic": Target,
};

function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = CATEGORY_ICONS[slug] ?? BookOpen;
  return <Icon className={className} strokeWidth={1.5} />;
}

/** Card and header image. Without an uploaded thumbnail, a calm tinted panel with the category icon. */
export function TrainingImage({
  training,
  className,
  priority,
}: {
  training: Pick<PublicTrainingCard, "thumbnail" | "category">;
  className?: string;
  priority?: boolean;
}) {
  if (training.thumbnail?.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs, not a known image host
      <img
        src={training.thumbnail.url}
        alt=""
        width={640}
        height={360}
        loading={priority ? "eager" : "lazy"}
        className={cn("aspect-video w-full rounded-md object-cover", className)}
      />
    );
  }
  return (
    <div aria-hidden="true" className={cn("flex aspect-video w-full items-center justify-center rounded-md bg-info-soft", className)}>
      <span className="flex size-16 items-center justify-center rounded-full bg-white text-primary shadow-[0_10px_20px_rgba(222,231,243,0.5)]">
        <CategoryIcon slug={training.category.slug} className="size-8" />
      </span>
    </div>
  );
}

export function PersonAvatar({ name, url, size = "md" }: { name: string; url: string | null; size?: "sm" | "md" | "lg" }) {
  const box = { sm: "size-7 text-xs", md: "size-10 text-sm", lg: "size-14 text-base" }[size];
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs
    return <img src={url} alt="" width={56} height={56} className={cn("shrink-0 rounded-full object-cover", box)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary font-heading font-semibold text-white", box)}
    >
      {initials(name)}
    </span>
  );
}
