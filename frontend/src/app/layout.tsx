import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoHeal AI — Autonomous SRE & Remediation Engine",
  description: "Closed-loop incident auto-remediation, sandbox verification, and automated GitHub pull requests.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
        {children}
      </body>
    </html>
  );
}
