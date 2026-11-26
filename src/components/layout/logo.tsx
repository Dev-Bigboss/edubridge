import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Wordmark cropped from the original logo files (public/assets/img/logo/logo-wordmark*.png). */
export function Logo({ light, className, priority }: { light?: boolean; className?: string; priority?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 rounded-sm", className)} aria-label="EduBridge home">
      <Image
        src={light ? "/assets/img/logo/logo-wordmark-light.png" : "/assets/img/logo/logo-wordmark.png"}
        alt=""
        width={470}
        height={140}
        priority={priority}
        className="h-11 w-auto md:h-12"
      />
    </Link>
  );
}
