"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useOpenConversation } from "@/lib/api/hooks/messages";

export const MESSAGES_HREF = { LEARNER: "/learn/messages", INSTRUCTOR: "/teach/messages" } as const;

/**
 * MSG-1: opens (or starts) the conversation with one person and goes to it. With `trainingId`, a learner
 * who hasn't booked or enrolled yet can still ask a question about that training (an enquiry).
 */
export function MessageButton({
  userId,
  trainingId = null,
  role,
  children,
  ariaLabel,
  variant = "outline",
}: {
  userId: string;
  trainingId?: string | null;
  role: "LEARNER" | "INSTRUCTOR";
  children: string;
  ariaLabel?: string;
  variant?: "outline" | "link" | "ghost";
}) {
  const router = useRouter();
  const open = useOpenConversation();
  const go = () =>
    open.mutate(
      { user_id: userId, training_id: trainingId },
      {
        onSuccess: (c) => router.push(`${MESSAGES_HREF[role]}?c=${c.id}`),
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "We couldn't open the conversation. Try again."),
      },
    );
  return (
    <Button type="button" variant={variant} loading={open.isPending} onClick={go} aria-label={ariaLabel}>
      {variant !== "link" && <MessageCircle aria-hidden="true" className="size-4" />}
      {children}
    </Button>
  );
}
