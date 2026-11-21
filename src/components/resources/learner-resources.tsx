"use client";

import { Download, ExternalLink, FileText, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoadError } from "@/components/admin/catalog-admin";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { useMyResources } from "@/lib/api/hooks/resources";
import { groupByFolder } from "@/lib/domain/resources";
import { formatBytes } from "@/lib/domain/uploads";

/** /learn/resources (RES-2/3): materials shared with me, by folder, in the instructor's order. */
export function LearnerResources() {
  const t = useTranslations("resources");
  const params = useSearchParams();
  const query = useMyResources(params.get("training"));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} description={t("intro")} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t("empty")}
          description={t("emptyBody")}
          action={
            <Button asChild variant="outline">
              <Link href="/learn/trainings">{t("toTrainings")}</Link>
            </Button>
          }
        />
      ) : (
        groupByFolder(query.data).map((g) => (
          <section key={g.folder ?? "none"} aria-label={g.folder ?? t("other")} className="mb-6">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-heading">
              <FolderOpen aria-hidden="true" className="size-5 text-primary" />
              {g.folder ?? t("other")}
            </h2>
            <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white">
              {g.items.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  {r.kind === "FILE" ? <FileText aria-hidden="true" className="size-5 shrink-0 text-primary" /> : <ExternalLink aria-hidden="true" className="size-5 shrink-0 text-primary" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-heading">{r.title}</p>
                    {r.description && <p className="text-[15px] leading-relaxed">{r.description}</p>}
                    <p className="text-sm">
                      {r.audience_label}
                      {r.file && ` · ${formatBytes(r.file.size_bytes)}`}
                    </p>
                  </div>
                  {r.kind === "FILE" && r.file?.url ? (
                    <Button asChild variant="outline">
                      <a href={r.file.url} download={r.file.name} aria-label={t("downloadLabel", { title: r.title })}>
                        <Download aria-hidden="true" className="size-4" />
                        {t("download")}
                      </a>
                    </Button>
                  ) : (
                    r.link_url && (
                      <Button asChild variant="outline">
                        <a href={r.link_url} target="_blank" rel="noopener noreferrer" aria-label={t("openLabel", { title: r.title })}>
                          <ExternalLink aria-hidden="true" className="size-4" />
                          {t("open")}
                        </a>
                      </Button>
                    )
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
