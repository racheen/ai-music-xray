import type { Metadata, Viewport } from "next";
import { PlaybackProvider } from "@/components/playback/PlaybackProvider";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Music X-Ray",
  description: "A Spotify-powered AI music intelligence platform with multi-model comparison, visual analytics, and history.",
  applicationName: "AI Music X-Ray",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Music X-Ray"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
};

export const viewport: Viewport = {
  themeColor: "#04110a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PlaybackProvider>{children}</PlaybackProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
