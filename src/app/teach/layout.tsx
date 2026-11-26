import { AppShell } from "@/components/layout/app-shell";

export default function Layout({ children }: LayoutProps<"/teach">) {
  return <AppShell role="INSTRUCTOR">{children}</AppShell>;
}
