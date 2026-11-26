import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** The centred icon + heading + white card used by every sign-in, sign-up and recovery screen. */
export function AuthCard({
  icon: Icon,
  title,
  subtitle,
  children,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-[450px]">
      <div className="mb-8 text-center">
        <span className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-surface-2 text-primary">
          <Icon aria-hidden="true" className="size-7" />
        </span>
        <h1 className="mb-2 text-[28px]">{title}</h1>
        {subtitle && <p className="leading-relaxed">{subtitle}</p>}
      </div>
      <div className="rounded-md border border-border bg-white p-6 shadow-[0_10px_30px_rgba(8,42,94,0.06)] md:p-8">
        {children}
      </div>
      {footer}
    </div>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-sm border border-danger/30 bg-danger-soft px-4 py-3 text-[15px] leading-relaxed text-danger">
      {message}
    </div>
  );
}

/** Confirmation inside a card: a sentence or two and the next action. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="rounded-sm border border-success/30 bg-success-soft px-4 py-3 text-[15px] leading-relaxed text-heading">
      {children}
    </div>
  );
}

export function AuthFooterLink({ prompt, href, label }: { prompt?: string; href: string; label: string }) {
  return (
    <p className="mt-6 text-center">
      {prompt && <>{prompt} </>}
      <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
        {label}
      </Link>
    </p>
  );
}
