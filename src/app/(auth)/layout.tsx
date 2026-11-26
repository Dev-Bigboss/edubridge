import { Logo } from "@/components/layout/logo";

/** Focused layout for sign-in, sign-up and onboarding: logo only, no site navigation. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-1">
      <header className="container-site flex h-20 items-center">
        <Logo priority />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 md:items-center">
        {children}
      </main>
    </div>
  );
}
