import { CalendarClock, MessageSquareText, PlaySquare, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowIcon, Button } from "@/components/ui/button";
import { Highlight, SectionTitle } from "@/components/ui/section-title";

/** Port of About1: overlapping photos with the blue badge on the left, feature list on the right. */
export async function HowItWorks() {
  const t = await getTranslations("landing.how");
  const items = [
    { icon: Users, title: t("cohortTitle"), body: t("cohortBody") },
    { icon: CalendarClock, title: t("oneTitle"), body: t("oneBody") },
    { icon: PlaySquare, title: t("recordingsTitle"), body: t("recordingsBody") },
    { icon: MessageSquareText, title: t("feedbackTitle"), body: t("feedbackBody") },
  ];

  return (
    <section className="py-20 md:py-[120px]">
      <div className="container-site grid items-center gap-14 xl:grid-cols-2">
        <div className="relative mx-auto w-full max-w-[560px]">
          <Image
            src="/assets/img/others/about_img01.png"
            alt=""
            width={389}
            height={484}
            sizes="(min-width: 768px) 389px, 70vw"
            className="relative z-[1] ml-auto w-[70%] md:w-[389px]"
          />
          <Image
            src="/assets/img/others/about_img02.png"
            alt=""
            width={260}
            height={263}
            className="absolute bottom-0 left-0 z-[2] w-[45%] rounded-xl border-8 border-white md:w-[260px]"
          />
          <Image
            src="/assets/img/others/about_dots.svg"
            alt=""
            width={112}
            height={97}
            className="absolute top-6 left-6 hidden md:block"
          />
        </div>

        <div>
          <SectionTitle eyebrow={t("eyebrow")} className="mb-5">
            {t("titleBefore")} <Highlight>{t("titleHighlight")}</Highlight>
          </SectionTitle>
          <p className="mb-8 leading-relaxed">{t("body")}</p>
          <ul className="mb-10 grid gap-6 sm:grid-cols-2">
            {items.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-primary">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <div>
                  <h3 className="mb-1 text-[17px]">{title}</h3>
                  <p className="text-[15px] leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <Button asChild size="lg">
            <Link href="/trainings">
              {t("cta")}
              <ArrowIcon />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
