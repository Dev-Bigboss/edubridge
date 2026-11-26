import { AppShell } from "@/components/layout/app-shell";

export default function Layout({ children }: LayoutProps<"/learn">) {
  return <AppShell role="LEARNER">{children}</AppShell>;
}
