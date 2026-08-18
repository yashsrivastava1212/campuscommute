import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthProvider";
import { ClientProviders } from "@/components/ClientProviders";
import { MixpanelAuthSync } from "@/components/analytics/MixpanelAuthSync";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CampusCommute — Where GIM moves together.",
  description:
    "Find fellow GIM students heading your way and share the journey. CampusCommute — GIM student carpooling.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ClientProviders>
          <AuthProvider>
            <MixpanelAuthSync />
            {children}
          </AuthProvider>
        </ClientProviders>
      </body>
    </html>
  );
}
