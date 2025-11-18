import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/src/lib/queryClient";
import { ThemeProvider } from "@/src/lib/theme-provider";
import React from "react";
import FooterGate from "@/src/components/FooterGate";
import CookieConsent from "@/src/components/CookieConsent";
import LiveChatWidget from "@/src/components/LiveChatWidget";
import UTMTracker from "@/src/components/UTMTracker";
import { ToastProvider } from "@/src/components/Toast";
import PWAInstallPrompt from "@/src/components/PWAInstallPrompt";
import ServiceWorkerRegistration from "@/src/components/ServiceWorkerRegistration";
import OfflineIndicator from "@/src/components/OfflineIndicator";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const mono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "PwezaCore", template: "%s | PwezaCore" },
  description: "PwezaCore – Multi-tenant school management SaaS platform.",
  manifest: "/manifest.json",
  themeColor: "#0f0f16",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PwezaCore",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f0f16" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PwezaCore" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0f0f16" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
      </head>
      <body className={`${inter.variable} ${mono.variable} antialiased touch-pan-y`}>
        <ThemeProvider defaultTheme="light" storageKey="pwezacore-theme">
          <ReactQueryProvider>
            <ToastProvider>
              <ServiceWorkerRegistration />
              <OfflineIndicator />
              <UTMTracker />
              {children}
              <CookieConsent />
              <LiveChatWidget />
              <PWAInstallPrompt />
              <FooterGate />
            </ToastProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
