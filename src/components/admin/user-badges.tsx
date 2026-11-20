"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/status-badge";
import type { ApprovalStatus, UserStatus } from "@/lib/domain/enums";

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const t = useTranslations("admin.users.statuses");
  const tone = status === "ACTIVE" ? "success" : status === "SUSPENDED" ? "danger" : "warning";
  return <Badge tone={tone}>{t(status)}</Badge>;
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const t = useTranslations("admin.users.approvals");
  const tone = status === "APPROVED" ? "success" : status === "REJECTED" ? "neutral" : "warning";
  return <Badge tone={tone}>{t(status)}</Badge>;
}
