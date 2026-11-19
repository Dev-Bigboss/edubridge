"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ROLE_HOME } from "@/lib/auth/routes";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";

const NAV = [
  { href: "/", key: "home" },
  { href: "/trainings", key: "trainings" },
  { href: "/register?role=instructor", key: "teach" },
] as const;

/** Port of the original Header1: transparent over the hero, white and sticky once you scroll. */
export function SiteHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,padding] duration-200",
        scrolled ? "bg-white py-2 shadow-[0_10px_15px_rgba(25,25,25,0.1)]" : "bg-transparent py-4",
      )}
    >
      <div className="mx-auto flex max-w-[var(--container-wide)] items-center justify-between gap-6 px-4 md:px-6">
        <Logo priority />

        <nav aria-label={t("nav.primary")} className="hidden xl:block">
          <ul className="flex items-center gap-2">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("?")[0]);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center rounded-sm px-3 font-heading text-heading transition-colors duration-150 hover:text-primary",
                      active && "text-primary",
                    )}
                  >
                    {t(`nav.${item.key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <AccountActions />
          </div>
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden" aria-label={t("common.openMenu")}>
                <Menu aria-hidden="true" className="size-6" />
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
              <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(340px,100vw)] flex-col gap-6 overflow-y-auto bg-white p-6 shadow-xl focus:outline-none">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="sr-only">{t("nav.primary")}</Dialog.Title>
                  <Logo />
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="icon" aria-label={t("common.closeMenu")}>
                      <X aria-hidden="true" className="size-6" />
                    </Button>
                  </Dialog.Close>
                </div>
                <nav aria-label={t("nav.primary")}>
                  <ul className="divide-y divide-border-subtle border-y border-border-subtle">
                    {NAV.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex min-h-12 items-center font-heading text-heading hover:text-primary"
                        >
                          {t(`nav.${item.key}`)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="flex flex-col gap-3" onClick={() => setOpen(false)}>
                  <AccountActions stacked />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}

/** Sign in / Create account for guests; a link back to the right dashboard for signed-in users. */
function AccountActions({ stacked }: { stacked?: boolean }) {
  const t = useTranslations();
  const { data: user } = useSession();

  if (user) {
    return (
      <Button asChild pill className={cn(stacked && "w-full")}>
        <Link href={ROLE_HOME[user.role]}>{t("shell.goToDashboard")}</Link>
      </Button>
    );
  }

  return (
    <div className={cn("flex gap-2", stacked && "flex-col")}>
      <Button asChild variant="outline" pill className={cn(stacked && "w-full")}>
        <Link href="/login">{t("common.signIn")}</Link>
      </Button>
      <Button asChild pill className={cn(stacked && "w-full")}>
        <Link href="/register">{t("common.signUp")}</Link>
      </Button>
    </div>
  );
}
