import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { TenantProvider } from "@/context/TenantContext";
import { ToastProvider } from "@/context/ToastContext";

export const metadata: Metadata = {
  title: "Reflex — Autonomous SRE & Self-Healing Platform",
  description:
    "Reflex catches production crashes from Sentry, verifies patches inside isolated Docker sandboxes, and opens merge-ready GitHub Pull Requests in 38 seconds.",
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
      <body className="bg-[#07080d] text-white dark:bg-[#07080d] dark:text-white min-h-screen antialiased selection:bg-indigo-500/30 selection:text-indigo-300 transition-colors duration-200">
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