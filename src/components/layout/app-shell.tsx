"use client";

import { ChevronDown, LogOut, Menu, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DropdownMenu } from "radix-ui";
import { Suspense, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/spinner";
import type { User } from "@/lib/api/schemas/auth";
import { useLogout } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/domain/enums";
import { Logo } from "./logo";
import { navFor, type NavItem } from "./nav-config";
import { RequireRole } from "./require-role";

const ACCOUNT_HREF = { LEARNER: "/learn/settings", INSTRUCTOR: "/teach/settings", ADMIN: "/admin/account" } as const;

const AREA_BASE = { LEARNER: "/learn", INSTRUCTOR: "/teach", ADMIN: "/admin" } as const;

const AREA_KEY: Record<Role, "learner" | "instructor" | "admin"> = {
  LEARNER: "learner",
  INSTRUCTOR: "instructor",
  ADMIN: "admin",
};

/**
 * Signed-in layout for /learn, /teach and /admin. Same look as the original dashboards
 * (white 240 px sidebar, blue active item, light top bar), built once for all three roles.
 */
/**
 * Signed-in areas read the URL (guard redirects, active nav item). On dynamic routes that is
 * request data, so Next 16 needs it behind Suspense. The area renders after sign-in anyway.
 */
export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <RequireRole role={role}>{(user) => <Shell user={user}>{children}</Shell>}</RequireRole>
    </Suspense>
  );
}

function Shell({ user, children }: { user: User; children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = navFor(user.role);
  const area = t(`shell.${AREA_KEY[user.role]}`);
  const current = activeItem(items, pathname);

  return (
    <div className="min-h-dvh bg-white lg:pl-[240px]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border-subtle bg-white lg:flex">
        <SidebarContent items={items} pathname={pathname} area={area} />
      </aside>

      {/* Mobile sidebar */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,85vw)] flex-col bg-white shadow-xl focus:outline-none lg:hidden">
            <Dialog.Title className="sr-only">{t("shell.areaNav", { area })}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="absolute top-3 right-3" aria-label={t("common.closeMenu")}>
                <X aria-hidden="true" className="size-5" />
              </Button>
            </Dialog.Close>
            <SidebarContent items={items} pathname={pathname} area={area} onNavigate={() => setOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border-subtle bg-surface-1/95 px-4 backdrop-blur-sm lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("common.openMenu")} onClick={() => setOpen(true)}>
            <Menu aria-hidden="true" className="size-6" />
          </Button>
          <p className="truncate font-heading text-lg font-semibold text-heading">
            {current ? t(`appNav.${current.labelKey}`) : area}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell base={AREA_BASE[user.role]} />
          <AccountMenu user={user} />
        </div>
      </header>

      <main id="main" className="px-4 py-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}

function SidebarContent({
  items,
  pathname,
  area,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  area: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations();
  const active = activeItem(items, pathname);
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">
        <Logo />
      </div>
      <p className="px-6 pt-2 pb-3 text-xs font-medium tracking-wide text-body uppercase">{area}</p>
      <nav aria-label={t("shell.areaNav", { area })} className="flex-1 overflow-y-auto px-3 pb-6">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = item === active;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-sm px-3 font-heading text-[15px] font-medium transition-colors duration-150",
                    isActive ? "bg-primary text-white" : "text-heading hover:bg-surface-1",
                  )}
                >
                  <item.icon aria-hidden="true" className="size-[18px] shrink-0" />
                  {t(`appNav.${item.labelKey}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function AccountMenu({ user }: { user: User }) {
  const t = useTranslations();
  const router = useRouter();
  const logout = useLogout();

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success(t("shell.signedOut"));
        router.replace("/login");
      },
    });

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-white focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Avatar user={user} />
          {/* Named by its content so the visible name is part of the accessible name (WCAG 2.5.3). */}
          <span className="sr-only">{t("shell.account")}: </span>
          <span className="sr-only max-w-[12rem] truncate font-medium text-heading sm:not-sr-only">{user.name}</span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[220px] rounded-md border border-border-subtle bg-white p-1.5 shadow-[0_10px_30px_rgba(8,42,94,0.12)]"
        >
          <div className="px-3 py-2">
            <p className="font-medium text-heading">{user.name}</p>
            <p className="truncate text-sm">{user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
          <DropdownMenu.Item asChild className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 text-heading outline-none data-[highlighted]:bg-surface-1">
            <Link href={ACCOUNT_HREF[user.role]}>
              <Settings aria-hidden="true" className="size-4" />
              {t("shell.accountSettings")}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            disabled={logout.isPending}
            onSelect={signOut}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 text-danger outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-danger-soft"
          >
            <LogOut aria-hidden="true" className="size-4" />
            {t("common.signOut")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Avatar({ user }: { user: User }) {
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex size-9 items-center justify-center rounded-full bg-primary font-heading text-sm font-semibold text-white"
    >
      {initials}
    </span>
  );
}

/** The most specific nav item matching the path, so /learn/payments doesn't also light up /learn. */
function activeItem(items: NavItem[], pathname: string): NavItem | undefined {
  return items
    .filter((i) => [i.href, ...(i.also ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
