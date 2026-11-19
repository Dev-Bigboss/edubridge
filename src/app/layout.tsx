import type { Metadata, Viewport } from "next";
import { Hind, Lexend_Deca } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Providers } from "@/components/providers";
import "./globals.css";

// Same typefaces as the original theme, now self-hosted by next/font (no layout shift, no Google request).
const lexend = Lexend_Deca({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const hind = Hind({
  variable: "--font-hind",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "EduBridge: live cohorts and one-on-one training", template: "%s | EduBridge" },
  description:
    "Learn live with vetted instructors. Join a cohort or book one-on-one sessions for professional exams, university courses and specific topics.",
  icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = {
  themeColor: "#1363df",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("common");
  return (
    <html lang="en" className={`${lexend.variable} ${hind.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-[100] rounded-sm bg-primary px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
