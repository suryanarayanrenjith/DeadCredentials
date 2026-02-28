import type { Metadata } from "next";
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
  title: "DeadCredentials - Password Obituary Generator",
  description:
    "Enter a password and receive its dramatic obituary. Check if it has been breached and discover its cause of death.",
  keywords: ["password", "security", "obituary", "breach", "cybersecurity", "HIBP"],
  openGraph: {
    title: "DeadCredentials — Password Obituary Generator",
    description: "Every password has a story. Most end tragically.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://js.puter.com/v2/" defer></script>
      </head>
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
