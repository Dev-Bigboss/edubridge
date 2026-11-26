import { cacheLife } from "next/cache";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";

/** Port of the original Footer1 on the dark navy background. */
export async function SiteFooter() {
  const t = await getTranslations();
  const linkClass =
    "inline-flex min-h-11 items-center text-white/80 transition-colors duration-150 hover:text-white focus-visible:text-white";

  return (
    <footer className="mt-auto bg-ink text-white/80 [main:has([data-cta-overlap])+&]:pt-20">
      <div className="container-site grid gap-10 pt-16 pb-10 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div>
          <Logo light className="mb-4" />
          <p className="max-w-sm leading-relaxed">{t("footer.about")}</p>
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className="mb-2 text-lg text-white">
            {t("footer.explore")}
          </h2>
          <ul>
            <li>
              <Link href="/trainings" className={linkClass}>
                {t("nav.trainings")}
              </Link>
            </li>
            <li>
              <Link href="/register?role=instructor" className={linkClass}>
                {t("nav.teach")}
              </Link>
            </li>
            <li>
              <Link href="/login" className={linkClass}>
                {t("common.signIn")}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="mb-2 text-lg text-white">
            {t("footer.legal")}
          </h2>
          <ul>
            <li>
              <Link href="/legal/terms" className={linkClass}>
                {t("footer.terms")}
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className={linkClass}>
                {t("footer.privacy")}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="mb-2 text-lg text-white">{t("footer.teachTitle")}</h2>
          <p className="mb-4 leading-relaxed">{t("footer.teachBody")}</p>
          <Button asChild variant="outline-light">
            <Link href="/register?role=instructor">{t("footer.teachCta")}</Link>
          </Button>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="container-site py-5 text-sm">{t("footer.rights", { year: await currentYear() })}</p>
      </div>
    </footer>
  );
}

// Reading the clock is request-time work under Cache Components; cache it for a day instead.
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
