import { GraduationCap, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowIcon, Button } from "@/components/ui/button";
import { Eyebrow, Highlight } from "@/components/ui/section-title";

/** Port of Banner1. Same background, photo, floating shapes and fact cards. */
export async function Hero() {
  const t = await getTranslations("landing.hero");
  return (
    <section className="relative overflow-hidden bg-surface-1 pt-32 md:pt-40 xl:min-h-[780px]">
      <Image
        src="/assets/img/banner/banner_bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-0 object-cover object-center"
      />
      <div className="container-site relative grid items-end gap-10 lg:grid-cols-2">
        <div className="relative pb-12 lg:pb-28">
          <Image
            src="/assets/img/banner/bshape_01.png"
            alt=""
            width={115}
            height={112}
            className="animate-float pointer-events-none absolute -top-16 right-[10%] hidden w-20 md:block"
          />
          <Image
            src="/assets/img/banner/bshape_02.png"
            alt=""
            width={88}
            height={100}
            className="pointer-events-none absolute bottom-6 -left-24 hidden w-16 2xl:block"
          />
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="relative isolate mb-5 text-[36px] leading-[1.19] sm:text-[44px] xl:text-display">
            {t("titleBefore")} <Highlight>{t("titleHighlight")}</Highlight> {t("titleAfter")}
          </h1>
          <p className="mb-8 max-w-[34rem] leading-[1.7]">{t("body")}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/trainings">
                {t("primaryCta")}
                <ArrowIcon />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register?role=instructor">{t("secondaryCta")}</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[632px]">
          <Image
            src="/assets/img/banner/banner_img.png"
            alt=""
            width={632}
            height={617}
            priority
            sizes="(min-width: 1024px) 632px, 90vw"
            className="relative z-[1] mx-auto"
          />
          <Image src="/assets/img/banner/bshape_03.png" alt="" width={130} height={127} className="absolute top-[12%] left-0 w-20 md:w-[130px]" />
          <Image src="/assets/img/banner/bshape_04.png" alt="" width={174} height={149} className="absolute top-[30%] right-0 hidden w-[140px] md:block" />
          <Image src="/assets/img/banner/bshape_05.png" alt="" width={104} height={99} className="absolute right-[18%] bottom-[8%] w-16 md:w-[104px]" />

          <FactCard className="top-1/2 left-0 -translate-y-1/2 sm:left-6" icon={<Users className="size-6" aria-hidden="true" />} label={t("factCohortLabel")} value={t("factCohortValue")} />
          <FactCard className="right-0 bottom-[22%] sm:right-6" icon={<GraduationCap className="size-6" aria-hidden="true" />} label={t("factOneLabel")} value={t("factOneValue")} />
        </div>
      </div>
    </section>
  );
}

function FactCard({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className: string }) {
  return (
    <div className={`absolute z-[2] hidden min-w-[150px] rounded-xl bg-white p-5 text-center shadow-[0_10px_30px_rgba(8,42,94,0.12)] sm:block ${className}`}>
      <span className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-surface-2 text-primary">{icon}</span>
      <span className="block text-sm">{label}</span>
      <span className="block font-heading text-lg font-semibold text-heading">{value}</span>
    </div>
  );
}
