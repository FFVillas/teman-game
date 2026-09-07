import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ToastHost from "@/components/notifications/ToastHost";
import NavOriginTracker from "@/components/NavOriginTracker";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

export const metadata: Metadata = {
  title: "TemanGame — Find Your Team",
  description:
    "Connect with thousands of players worldwide. Filter by rank, role, and playstyle to dominate the leaderboard in your favorite competitive games.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-bg-page text-text-primary"
        // Grammarly and similar extensions inject attributes onto <body>
        // (data-gr-ext-installed, data-new-gr-c-s-check-loaded) before React
        // hydrates, which trips the hydration warning. This suppresses only
        // this element's own attributes — mismatches inside the tree still warn.
        suppressHydrationWarning
      >
        <AuthProvider>
          <NotificationProvider>
            <NavOriginTracker />
            {children}
            <ToastHost />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
