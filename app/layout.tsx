import {
  ClerkProvider,
} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ReduxProvider from "@/lib/redux/ReduxProvider";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PS-CRM | Police & Public Services",
  description: "Citizen Relationship Management for modern public governance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="scroll-smooth">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-indigo-100 selection:text-indigo-900`}
        >
          <ReduxProvider>
            <Navbar />
            <main className="relative pt-20">
              {children}
            </main>
          </ReduxProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
