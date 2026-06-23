import type { Metadata } from "next";
import { Space_Grotesk, Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://synthesis-charan.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Synthesis — autonomous research engine",
    template: "%s · Synthesis",
  },
  description:
    "Watch a team of AI agents plan, search, cross-check, verify, and synthesize a fully cited report — live.",
  applicationName: "Synthesis",
  authors: [{ name: "Chanda Charan Reddy", url: "https://www.charanreddy.dev" }],
  creator: "Chanda Charan Reddy",
  keywords: [
    "multi-agent AI",
    "research engine",
    "LLM agents",
    "RAG",
    "citation verification",
    "Next.js",
    "Gemini",
    "agent orchestration",
  ],
  openGraph: {
    title: "Synthesis — autonomous multi-agent research engine",
    description:
      "Planner, parallel researchers, and a critic that verifies every claim — with the whole orchestration visualized live.",
    type: "website",
    url: siteUrl,
    siteName: "Synthesis",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synthesis — autonomous research engine",
    description:
      "A team of AI agents plans, searches, verifies, and synthesizes a fully cited report — live.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${serif.variable} ${mono.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
