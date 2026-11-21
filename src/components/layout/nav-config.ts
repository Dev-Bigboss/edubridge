import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileClock,
  FolderOpen,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Layers,
  MessageCircle,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/domain/enums";

export type NavItem = {
  href: string;
  /** Key under `appNav` in messages/en.json */
  labelKey: string;
  icon: LucideIcon;
  /** Delivery phase from docs/redesign-plan.md §6. Items show once their phase has shipped. */
  phase: 0 | 1 | 2 | 3;
  req: string;
  /** Shown before its whole phase ships, because this page is done. */
  ready?: true;
  /** Other paths that belong to this item, e.g. the booking page under "One-on-one bookings". */
  also?: string[];
};

/** Route map from plan §4. Shared pages (messages, settings) are mounted inside each area. */
export const NAV: Record<Role, NavItem[]> = {
  LEARNER: [
    { href: "/learn", labelKey: "dashboard", icon: LayoutDashboard, phase: 0, req: "NTF-1" },
    { href: "/learn/trainings", labelKey: "myTrainings", icon: BookOpen, phase: 1, req: "TRN-7, COH-4", ready: true, also: ["/learn/recordings", "/learn/resources"] },
    { href: "/learn/bookings", labelKey: "oneOnOneBookings", icon: CalendarClock, phase: 2, req: "OTO-2..9", ready: true, also: ["/learn/book"] },
    { href: "/learn/payments", labelKey: "payments", icon: CreditCard, phase: 1, req: "PAY-6", ready: true },
    { href: "/learn/messages", labelKey: "messages", icon: MessageCircle, phase: 3, req: "MSG-1..6", ready: true },
    { href: "/learn/notifications", labelKey: "notifications", icon: Bell, phase: 1, req: "NTF-1", ready: true },
    { href: "/learn/settings", labelKey: "settings", icon: Settings, phase: 1, req: "NTF-2, ONB-2", ready: true },
  ],
  INSTRUCTOR: [
    { href: "/teach", labelKey: "dashboard", icon: LayoutDashboard, phase: 0, req: "OTO-4, PAY-7" },
    { href: "/teach/requests", labelKey: "requests", icon: Inbox, phase: 2, req: "OTO-4..6", ready: true },
    { href: "/teach/schedule", labelKey: "schedule", icon: CalendarCheck, phase: 2, req: "OTO-10", ready: true, also: ["/teach/sessions"] },
    { href: "/teach/recordings", labelKey: "recordings", icon: Video, phase: 2, req: "REC-2..5", ready: true },
    { href: "/teach/resources", labelKey: "resources", icon: FolderOpen, phase: 2, req: "RES-1..4", ready: true },
    { href: "/teach/availability", labelKey: "availability", icon: CalendarClock, phase: 2, req: "OTO-1", ready: true },
    { href: "/teach/trainings", labelKey: "myTrainings", icon: GraduationCap, phase: 2, req: "COH-1, RES-1" },
    { href: "/teach/earnings", labelKey: "earnings", icon: Wallet, phase: 3, req: "PAY-7" },
    { href: "/teach/messages", labelKey: "messages", icon: MessageCircle, phase: 3, req: "MSG-1..6", ready: true },
    { href: "/teach/notifications", labelKey: "notifications", icon: Bell, phase: 1, req: "NTF-1", ready: true },
    { href: "/teach/settings", labelKey: "settings", icon: Settings, phase: 1, req: "ONB-3, NTF-2", ready: true },
  ],
  ADMIN: [
    { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard, phase: 0, req: "ADM-1" },
    { href: "/admin/trainings", labelKey: "trainings", icon: BookOpen, phase: 1, req: "TRN-1..7", ready: true },
    { href: "/admin/cohorts", labelKey: "cohorts", icon: Layers, phase: 1, req: "COH-1..5", ready: true },
    { href: "/admin/catalog", labelKey: "categoriesAndModalities", icon: Tags, phase: 1, req: "TRN-2..4", ready: true },
    { href: "/admin/pricing", labelKey: "pricing", icon: BadgeDollarSign, phase: 1, req: "PRC-1..5", ready: true },
    { href: "/admin/users", labelKey: "users", icon: Users, phase: 1, req: "ADM-2, ONB-3", ready: true },
    { href: "/admin/payments", labelKey: "paymentsAndRefunds", icon: CreditCard, phase: 1, req: "PAY-5, PAY-8", ready: true },
    { href: "/admin/moderation", labelKey: "moderation", icon: ShieldCheck, phase: 3, req: "FDB-4, MSG-6" },
    { href: "/admin/reports", labelKey: "reports", icon: BarChart3, phase: 3, req: "ADM-4" },
    { href: "/admin/audit-log", labelKey: "auditLog", icon: FileClock, phase: 1, req: "ADM-5", ready: true },
    { href: "/admin/notifications", labelKey: "notifications", icon: Bell, phase: 1, req: "NTF-1", ready: true },
    { href: "/admin/account", labelKey: "myAccount", icon: Settings, phase: 1, req: "NFR Security, NTF-2", ready: true },
    { href: "/admin/settings", labelKey: "platformSettings", icon: ClipboardList, phase: 1, req: "ADM-3", ready: true },
  ],
};

/** Highest phase that has shipped. Bump as each phase lands so its nav items appear. */
export const SHIPPED_PHASE = 0;

export function navFor(role: Role): NavItem[] {
  return NAV[role].filter((i) => i.phase <= SHIPPED_PHASE || i.ready);
}
