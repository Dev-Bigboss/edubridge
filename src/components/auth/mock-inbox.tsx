"use client";

import { Mail } from "lucide-react";
import { z } from "zod";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/query";

const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "on";

const Outbox = z.object({
  emails: z.array(z.object({ to: z.string(), subject: z.string(), link: z.string(), sent_at: z.string() })),
});

/**
 * Demo aid, only with mocks on: shows the email the backend would have sent, so a reviewer can
 * click the verification or reset link without a mail server. Renders nothing in real builds.
 */
export function MockInbox({ email, kind }: { email: string; kind: "verify" | "reset" }) {
  const { data } = useApiQuery({
    queryKey: ["mock-outbox", email],
    enabled: MOCKING && !!email,
    refetchInterval: 2000,
    queryFn: () => api("/__mock/outbox", { query: { to: email.toLowerCase() }, schema: Outbox }),
  });
  if (!MOCKING) return null;
  const mail = data?.emails.find((m) => m.link.includes(kind === "verify" ? "/verify-email" : "/reset-password"));
  return (
    <div className="mt-6 rounded-sm border border-dashed border-border bg-white p-4 text-sm leading-relaxed">
      <p className="mb-1 flex items-center gap-2 font-heading font-medium text-heading">
        <Mail aria-hidden="true" className="size-4" /> Demo inbox (mock API)
      </p>
      {mail ? (
        <p>
          {mail.subject}:{" "}
          <a href={mail.link} className="break-all font-medium text-primary underline underline-offset-4">
            open the link
          </a>
        </p>
      ) : (
        <p>No email for this address yet.</p>
      )}
    </div>
  );
}
