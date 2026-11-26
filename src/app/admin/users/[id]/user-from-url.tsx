"use client";

import { useParams } from "next/navigation";
import { UserDetail } from "@/components/admin/user-detail";

export function UserFromUrl() {
  const { id } = useParams<{ id: string }>();
  return <UserDetail id={id} />;
}
