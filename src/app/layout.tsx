import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Music X-Ray",
  description: "A Spotify-powered real-time AI music visualizer with optional open-source model hooks."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
