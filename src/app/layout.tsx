import type { Metadata } from "next";
import { APP_VERSION } from "@/lib/version";
import "./globals.css";

export const metadata: Metadata = {
  title: "Translate Chat - 即時翻譯對話",
  description: "即時翻譯通訊 App - 打破語言界限",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo-translate-chat.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen flex flex-col">
        {children}
        <footer className="text-center text-gray-400 text-xs py-4 mt-auto">
          Translate Chat {APP_VERSION} &nbsp;·&nbsp; Powered by DeepSeek
        </footer>
      </body>
    </html>
  );
}
