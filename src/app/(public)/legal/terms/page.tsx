import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { TERMS } from "@/lib/legal/documents";

export const metadata: Metadata = { title: TERMS.title, description: TERMS.summary };

export default function TermsPage() {
  return <LegalPage doc={TERMS} />;
}
