import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { Suspense } from 'react';
import { stackClientApp } from "../stack/client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blueprint Botanica",
  description: "Interactive plant design canvas",
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
        <StackProvider app={stackClientApp}>
          <StackTheme>
            <Suspense fallback={
              <nav className="bg-[#00563B] shadow-xl sticky top-0 z-50 h-16 flex items-center justify-center">
                <span className="text-[#B7C398] text-sm">Loading...</span>
              </nav>
            }>
              <Navbar />
            </Suspense>
            {children}
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}