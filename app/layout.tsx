import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/src/lib/queryClient";
import { ThemeProvider } from "@/src/lib/theme-provider";
import React from "react";
import FooterGate from "@/src/components/FooterGate";
import CookieConsent from "@/src/components/CookieConsent";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${mono.variable} antialiased`}
      >
        <ThemeProvider
          defaultTheme="light"
          storageKey="pwezacore-theme"
        >
          <ReactQueryProvider>
            {children}
            <CookieConsent />
            <FooterGate />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
