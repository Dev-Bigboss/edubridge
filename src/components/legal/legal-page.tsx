import { TriangleAlert } from "lucide-react";
import type { LegalDocument } from "@/lib/legal/documents";

export function LegalPage({ doc }: { doc: LegalDocument }) {
  const effective = new Date(`${doc.version}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <article className="container-site max-w-3xl pt-36 pb-20 md:pt-44">
      <header className="mb-10 border-b border-border pb-8">
        <h1 className="mb-3 text-page">{doc.title}</h1>
        <p className="mb-4 text-lg leading-relaxed">{doc.summary}</p>
        <p className="text-sm">Version of {effective}</p>
        <p className="mt-6 flex items-start gap-3 rounded-sm border border-accent/60 bg-accent/10 px-4 py-3 text-[15px] leading-relaxed text-heading">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          Draft for legal review. This wording explains how the platform works and will be replaced by the reviewed version before launch.
        </p>
      </header>
      {doc.sections.map((s) => (
        <section key={s.heading} className="mb-8">
          <h2 className="mb-3 text-section">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p.slice(0, 32)} className="mb-3 max-w-[68ch] leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
