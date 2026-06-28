import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HireMind AI — The Intelligence Layer for Modern Hiring",
    template: "%s · HireMind AI",
  },
  description:
    "AI-powered recruitment platform that understands job descriptions semantically, intelligently ranks candidates, and explains every decision.",
  keywords: ["AI hiring", "candidate ranking", "recruitment", "semantic search", "explainable AI"],
  authors: [{ name: "HireMind AI" }],
  openGraph: {
    title: "HireMind AI",
    description: "The Intelligence Layer for Modern Hiring",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
