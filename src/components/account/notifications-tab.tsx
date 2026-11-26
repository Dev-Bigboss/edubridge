"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LoadError } from "@/components/admin/catalog-admin";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { usePreferences, useSavePreferences } from "@/lib/api/hooks/account";
import type { Preferences } from "@/lib/api/schemas/account";
import type { User } from "@/lib/api/schemas/auth";
import { NOTIFICATION_GROUPS } from "@/lib/domain/notification-groups";

type Item = Preferences["items"][number];

/** NTF-2: one row per kind of event, a switch per channel. Locked channels say why. */
export function NotificationsTab({ user }: { user: User }) {
  const query = usePreferences();
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <LoadError onRetry={query.refetch} />;
  return <PreferencesForm saved={query.data} key={user.id} />;
}

function PreferencesForm({ saved }: { saved: Item[] }) {
  const t = useTranslations("account.notifications");
  const save = useSavePreferences();
  const [items, setItems] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(items) !== JSON.stringify(saved);

  const toggle = (group: Item["group"], channel: "in_app" | "email") =>
    setItems((list) => list.map((i) => (i.group === group ? { ...i, [channel]: !i[channel] } : i)));

  const submit = async () => {
    setError(null);
    try {
      const res = await save.mutateAsync(items);
      setItems(res.items);
      toast.success(t("saved"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("failed"));
    }
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <p className="mb-5 leading-relaxed">{t("intro")}</p>
      <FormError message={error} />
      <table className="w-full text-[15px]">
        <caption className="sr-only">{t("caption")}</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-2 pr-3 text-left font-heading text-sm font-medium text-heading">
              {t("event")}
            </th>
            <th scope="col" className="w-20 py-2 text-center font-heading text-sm font-medium text-heading">
              {t("inApp")}
            </th>
            <th scope="col" className="w-20 py-2 text-center font-heading text-sm font-medium text-heading">
              {t("email")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {items.map((item) => {
            const locked = NOTIFICATION_GROUPS.find((g) => g.key === item.group)?.locked ?? [];
            return (
              <tr key={item.group}>
                <th scope="row" className="py-3 pr-3 text-left font-normal">
                  <span className="block font-medium text-heading">{t(`groups.${item.group}.label`)}</span>
                  <span className="block text-sm leading-relaxed">{t(`groups.${item.group}.hint`)}</span>
                  {locked.length > 0 && <span className="block text-sm text-heading">{t(locked.length === 2 ? "lockedBoth" : "lockedEmail")}</span>}
                </th>
                {(["in_app", "email"] as const).map((channel) => (
                  <td key={channel} className="py-3 text-center">
                    <label className="inline-flex size-11 cursor-pointer items-center justify-center has-[:disabled]:cursor-not-allowed">
                      <span className="sr-only">
                        {t(`groups.${item.group}.label`)}: {channel === "in_app" ? t("inApp") : t("email")}
                      </span>
                      <input
                        type="checkbox"
                        className="size-5 accent-primary"
                        checked={item[channel]}
                        disabled={locked.includes(channel)}
                        onChange={() => toggle(item.group, channel)}
                      />
                    </label>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-5 flex justify-end gap-3 border-t border-border-subtle pt-5">
        {dirty && (
          <Button variant="ghost" onClick={() => setItems(saved)}>
            {t("discard")}
          </Button>
        )}
        <Button onClick={() => void submit()} loading={save.isPending} disabled={!dirty}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
