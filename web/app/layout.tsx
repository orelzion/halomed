import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Noto_Sans_Hebrew } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PowerSyncProvider } from "@/components/providers/PowerSyncProvider";
import { getTranslation } from "@/lib/i18n";

const t = getTranslation();

// Load Google Fonts
const frankRuhlLibre = Frank_Ruhl_Libre({
  weight: '700',
  subsets: ['latin', 'hebrew'],
  variable: '--font-source',
  display: 'swap',
});

const notoSansHebrew = Noto_Sans_Hebrew({
  weight: '400',
  subsets: ['hebrew', 'latin'],
  variable: '--font-explanation',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${t('app_name')} - HaLomeid`,
  description: t('daily_mishna'),
  manifest: '/manifest.json',
  themeColor: '#D4A373',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: t('app_name'),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${frankRuhlLibre.variable} ${notoSansHebrew.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <PowerSyncProvider>
              {children}
            </PowerSyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
