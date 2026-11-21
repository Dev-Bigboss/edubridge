"use client";

import { MessageCircle, MessagesSquare, SquarePen } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LoadError } from "@/components/admin/catalog-admin";
import { PersonAvatar } from "@/components/catalog/bits";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useContacts, useConversations, useOpenConversation } from "@/lib/api/hooks/messages";
import type { Contact } from "@/lib/api/schemas/messages";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { browserTimeZone } from "@/lib/domain/time";
import { ConversationList } from "./conversation-list";
import { Thread } from "./thread";

/**
 * /learn/messages and /teach/messages (MSG-1..4): the list beside the open conversation on wide
 * screens; on phones the list, then the conversation full screen (`?c=` keeps Back working).
 */
export function MessagesPage({ base }: { base: "/learn/messages" | "/teach/messages" }) {
  const t = useTranslations("inbox");
  const params = useSearchParams();
  const selected = params.get("c");
  const { data: user } = useSession();
  const list = useConversations();
  const [picking, setPicking] = useState(false);
  const zone = user?.timezone ?? browserTimeZone();

  return (
    // Fills the area under the top bar; the page itself doesn't scroll, the two panes do.
    <div className="-mx-4 -my-6 grid h-[calc(100dvh-64px)] min-h-[420px] grid-cols-[minmax(0,1fr)] bg-white lg:-mx-8 lg:-my-8 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section aria-labelledby="inbox-title" className={cn("flex min-h-0 flex-col border-border-subtle lg:border-r", selected && "hidden lg:flex")}>
        <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
          <h1 id="inbox-title" className="font-heading text-xl font-semibold text-heading">
            {t("title")}
          </h1>
          <Button variant="outline" onClick={() => setPicking(true)}>
            <SquarePen aria-hidden="true" className="size-4" />
            {t("new")}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.isPending ? (
            <LoadingState label={t("loading")} />
          ) : list.isError ? (
            <div className="p-4">
              <LoadError onRetry={list.refetch} />
            </div>
          ) : list.data.length === 0 ? (
            <EmptyState
              className="m-4"
              icon={MessageCircle}
              title={t("empty")}
              description={user?.role === "INSTRUCTOR" ? t("emptyInstructor") : t("emptyLearner")}
              action={<Button onClick={() => setPicking(true)}>{t("new")}</Button>}
            />
          ) : (
            <ConversationList items={list.data} selected={selected} base={base} zone={zone} />
          )}
        </div>
      </section>

      <section aria-label={t("conversation")} className={cn("min-h-0 flex-col", selected ? "flex" : "hidden lg:flex")}>
        {selected && user ? (
          <Thread key={selected} id={selected} base={base} me={user.id} zone={zone} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-surface-1/60 px-6 text-center">
            <MessagesSquare aria-hidden="true" className="mb-3 size-8 text-primary" />
            <p className="font-heading font-semibold text-heading">{t("pickTitle")}</p>
            <p className="max-w-sm text-[15px] leading-relaxed">{t("pickBody")}</p>
          </div>
        )}
      </section>

      {picking && <NewMessageDialog base={base} onClose={() => setPicking(false)} learner={user?.role === "LEARNER"} />}
    </div>
  );
}

/** BR-6: only people I've booked, enrolled with or asked about a training can be messaged. */
function NewMessageDialog({ base, onClose, learner }: { base: string; onClose: () => void; learner: boolean }) {
  const t = useTranslations("inbox");
  const router = useRouter();
  const contacts = useContacts();
  const open = useOpenConversation();
  const [pending, setPending] = useState<string | null>(null);

  const choose = (c: Contact) => {
    if (c.conversation_id) {
      onClose();
      return router.push(`${base}?c=${c.conversation_id}`);
    }
    setPending(c.id);
    open.mutate(
      { user_id: c.id },
      {
        onSuccess: (conversation) => {
          onClose();
          router.push(`${base}?c=${conversation.id}`);
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : t("openFailed")),
        onSettled: () => setPending(null),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("newTitle")} description={learner ? t("newLearner") : t("newInstructor")}>
      {contacts.isPending ? (
        <LoadingState />
      ) : contacts.isError ? (
        <LoadError onRetry={contacts.refetch} />
      ) : contacts.data.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={t("noContacts")}
          description={learner ? t("noContactsLearner") : t("noContactsInstructor")}
          action={
            learner ? (
              <Button asChild variant="outline">
                <Link href="/trainings">{t("browse")}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border-subtle">
          {contacts.data.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={!!pending}
                onClick={() => choose(c)}
                className="flex min-h-11 w-full items-center gap-3 rounded-sm px-2 py-3 text-left hover:bg-surface-1 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
              >
                <PersonAvatar name={c.name} url={c.avatar_url} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-heading">{c.name}</span>
                  <span className="block truncate text-sm">{c.context_label}</span>
                </span>
                {pending === c.id && <Spinner className="text-primary" label={t("opening")} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
