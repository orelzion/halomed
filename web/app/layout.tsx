import type { Metadata, Viewport } from "next";
import { Frank_Ruhl_Libre, Noto_Sans_Hebrew } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { SyncIndicator } from "@/components/ui/SyncIndicator";
import { getTranslation } from "@/lib/i18n";
import { SkipLink } from "@/components/ui/SkipLink";
import { CookieConsentBanner } from "@/components/ui/CookieConsentBanner";
import { Footer } from "@/components/layout/Footer";

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
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: t('app_name'),
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#D4A373',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${frankRuhlLibre.variable} ${notoSansHebrew.variable} antialiased`}>
        <SkipLink />
        <ThemeProvider>
          <AuthProvider>
            <SyncProvider>
              <div className="min-h-screen flex flex-col">
                <main id="main-content" className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
              <SyncIndicator />
              <CookieConsentBanner />
            </SyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
