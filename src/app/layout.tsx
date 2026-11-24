import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ToastHost from "@/components/notifications/ToastHost";
import NavOriginTracker from "@/components/NavOriginTracker";
import PwaSetup from "@/components/PwaSetup";
import PushPrompt from "@/components/PushPrompt";
import SuspensionWatcher from "@/components/SuspensionWatcher";
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
    "Find teammates for competitive games by rank, role and playstyle, with a reputation you can check before you play.",
  applicationName: "TemanGame",
  // Installed on an iPhone home screen: own window, own name under the icon.
  // "black" keeps iOS's status bar (clock, notch) as its own black strip above
  // the page. "black-translucent" drew the page underneath it, so the navbar
  // sat behind the clock and the notch.
  appleWebApp: {
    capable: true,
    title: "TemanGame",
    statusBarStyle: "black",
  },
  icons: {
    apple: "/pwa/apple-touch-icon.png",
  },
};

// The browser bar and the installed app's title bar take the page colour.
// No `viewportFit: "cover"`: that lets the page run under the notch and the
// home indicator, which only works if every edge pads itself with
// env(safe-area-inset-*). Leaving it out, the phone keeps those areas clear.
export const viewport: Viewport = {
  themeColor: "#0e1015",
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
            <PwaSetup />
            <PushPrompt />
            <SuspensionWatcher />
            {children}
            <ToastHost />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
