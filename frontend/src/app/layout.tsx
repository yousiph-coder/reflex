import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { TenantProvider } from "@/context/TenantContext";
import { ToastProvider } from "@/context/ToastContext";

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('autoheal_theme');
                  var theme = saved === 'light' ? 'light' : 'dark';
                  document.documentElement.classList.remove('dark', 'light');
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[#000000] text-zinc-100 dark:bg-[#000000] dark:text-zinc-100 min-h-screen antialiased selection:bg-emerald-500/20 selection:text-emerald-400 transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <TenantProvider>
              <ToastProvider>{children}</ToastProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
