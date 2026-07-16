import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientErrorBoundary from "@/app/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeadCredentials — Password Obituary Generator",
  description:
    "Free, open-source password auditor. Check if your password was breached, analyze its strength, and receive its dramatic obituary. No sign-up, no accounts, no cost.",
  keywords: ["password", "security", "obituary", "breach", "cybersecurity", "HIBP", "free", "open source", "no signup"],
  applicationName: "DeadCredentials",
  manifest: "/manifest.webmanifest",
  authors: [{ name: "suryanarayanrenjith" }],
  openGraph: {
    title: "DeadCredentials — Password Obituary Generator",
    description: "Every password has a story. Most end tragically. Free & open source — no sign-up required.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "DeadCredentials",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientErrorBoundary>
          {children}
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
