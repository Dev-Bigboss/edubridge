import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

/**
 * Buttons keep the original EduBridge look: solid #1363df, navy on hover, semibold.
 * `size="lg"` is the marketing button from the old theme (uppercase, tall, arrow);
 * `md` is the in-app size (sentence case, 44 px tall for touch).
 */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-heading font-semibold",
    "transition-colors duration-200 ease-out select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:cursor-not-allowed disabled:opacity-55 aria-busy:cursor-progress",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover active:bg-ink",
        outline:
          "border border-primary bg-white text-primary hover:bg-primary hover:text-white active:bg-primary-hover",
        white: "bg-white text-heading hover:bg-heading hover:text-white active:bg-ink",
        "outline-light": "border border-white/70 text-white hover:bg-white hover:text-heading",
        ghost: "text-heading hover:bg-surface-1 active:bg-surface-2",
        danger: "bg-danger text-white hover:bg-[#a51818] active:bg-[#861313]",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        md: "h-11 min-w-11 px-5 text-[15px]",
        lg: "h-[54px] px-6 text-[15px] uppercase tracking-[0.5px]",
        icon: "size-11",
      },
      pill: { true: "rounded-full" },
    },
    // Text links sit flush with the text around them, whatever size is set.
    compoundVariants: [{ variant: "link", class: "h-auto min-w-0 px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    withArrow?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  pill,
  asChild,
  loading,
  withArrow,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, pill }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner className="size-4" />}
          {children}
          {withArrow && !loading && <ArrowIcon />}
        </>
      )}
    </Comp>
  );
}

/** The original theme's button arrow (public/assets/img/icons/btn-arrow.svg). */
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="13"
      viewBox="0 0 14 13"
      fill="none"
      className={cn("-mt-0.5 shrink-0", className)}
    >
      <path
        d="M12.6249 6.81239H1.00011M12.6249 6.81239L7.78123 1.96873M12.6249 6.81239L7.78123 11.656"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
