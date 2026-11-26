import { BookOpenCheck, Landmark, Target, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowIcon, Button } from "@/components/ui/button";
import { Highlight, SectionTitle } from "@/components/ui/section-title";

/**
 * Port of Categories1. Tiles are the three seeded SRS categories (TRN-3). In Phase 1 this list
 * comes from GET /categories so admin-added categories appear without a deploy.
 */
export async function Categories() {
  const t = await getTranslations("landing.categories");
  const categories: { slug: string; icon: LucideIcon; name: string; hint: string }[] = [
    { slug: "professional-exam", icon: Landmark, name: t("professionalExam"), hint: t("professionalExamHint") },
    { slug: "university-course", icon: BookOpenCheck, name: t("universityCourse"), hint: t("universityCourseHint") },
    { slug: "specific-topic", icon: Target, name: t("specificTopic"), hint: t("specificTopicHint") },
  ];

  return (
    <section className="relative overflow-hidden bg-white py-20 md:py-[130px]">
      <div className="container-site grid items-center gap-12 xl:grid-cols-[5fr_7fr]">
        <div className="text-center xl:text-left">
          <SectionTitle eyebrow={t("eyebrow")} className="mb-5">
            {t("titleBefore")} <Highlight>{t("titleHighlight")}</Highlight>
          </SectionTitle>
          <p className="mx-auto mb-8 max-w-xl leading-relaxed xl:mx-0">{t("body")}</p>
          <Button asChild size="lg" variant="outline">
            <Link href="/trainings">
              {t("cta")}
              <ArrowIcon />
            </Link>
          </Button>
        </div>

        <ul className="grid gap-5 sm:grid-cols-3">
          {categories.map(({ slug, icon: Icon, name, hint }) => (
            <li key={slug}>
              <Link
                href={`/trainings?category=${slug}`}
                className="group flex h-full flex-col items-center rounded-md bg-surface-1 px-6 pt-8 pb-7 text-center transition-colors duration-200 hover:bg-primary"
              >
                <span className="mb-4 flex size-[83px] items-center justify-center rounded-full bg-white text-primary shadow-[0_10px_20px_rgba(222,231,243,0.5)]">
                  <Icon aria-hidden="true" className="size-10" strokeWidth={1.5} />
                </span>
                <span className="mb-1 font-heading text-lg font-semibold text-heading group-hover:text-white">
                  {name}
                </span>
                <span className="text-[15px] leading-relaxed group-hover:text-white/85">{hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Image
        src="/assets/img/objects/categories_shape01.png"
        alt=""
        width={137}
        height={106}
        className="pointer-events-none absolute top-16 left-[4%] hidden opacity-80 2xl:block"
      />
      <Image
        src="/assets/img/objects/categories_shape02.png"
        alt=""
        width={196}
        height={160}
        className="pointer-events-none absolute right-[3%] bottom-10 hidden 2xl:block"
      />
    </section>
  );
}
