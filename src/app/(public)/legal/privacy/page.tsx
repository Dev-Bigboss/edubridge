import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { PRIVACY } from "@/lib/legal/documents";

export const metadata: Metadata = { title: PRIVACY.title, description: PRIVACY.summary };

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} />;
}
