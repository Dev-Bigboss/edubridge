import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowIcon, Button } from "@/components/ui/button";
import { Highlight } from "@/components/ui/section-title";

/** Port of Cta1: blue patterned band that overlaps the footer. */
export async function TeachCta() {
  const t = await getTranslations("landing.cta");
  return (
    <section data-cta-overlap className="relative z-[2] pt-10 pb-0">
      <div className="container-site">
        <div className="relative isolate -mb-20 flex flex-col items-start gap-6 overflow-hidden rounded-[8px] bg-primary bg-[url(/assets/img/bg/cta_bg.png)] bg-cover bg-center px-6 py-10 md:flex-row md:items-center md:gap-10 md:px-[60px] md:py-[46px]">
          <h2 className="relative isolate shrink-0 text-[28px] leading-[1.32] tracking-[-1px] text-white md:text-page">
            {t("titleBefore")} <Highlight>{t("titleHighlight")}</Highlight> {t("titleAfter")}
          </h2>
          <p className="max-w-xl leading-relaxed text-white/90">{t("body")}</p>
          <Button asChild size="lg" variant="white" className="md:ml-auto">
            <Link href="/register?role=instructor">
              {t("button")}
              <ArrowIcon />
            </Link>
          </Button>
          <Image
            src="/assets/img/objects/cta_shape01.svg"
            alt=""
            width={70}
            height={71}
            className="pointer-events-none absolute -top-9 left-6 -z-10"
          />
          <Image
            src="/assets/img/objects/cta_shape02.svg"
            alt=""
            width={112}
            height={127}
            className="pointer-events-none absolute -right-5 -bottom-20 -z-10"
          />
        </div>
      </div>
    </section>
  );
}
