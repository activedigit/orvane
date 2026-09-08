import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const plex = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-plex-arabic', display: 'swap' });

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'عروض';

export const metadata: Metadata = {
  title: { default: `${appName} | اطلب مرة واحدة واستقبل عروض أسعار من الشركات المناسبة`, template: `%s | ${appName}` },
  description: 'منصة عروض أسعار خاصة: اكتب ما تحتاجه، قارن العروض، واختر المزود الأنسب لك. بدون اتصالات عشوائية، بياناتك تبقى خاصة.',
  applicationName: appName,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: '#0f5c56', width: 'device-width', initialScale: 1, maximumScale: 5 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body className="antialiased">
        {children}
        <Toaster position="top-center" richColors dir="rtl" toastOptions={{ style: { fontFamily: 'inherit' } }} closeButton />
      </body>
    </html>
  );
}
