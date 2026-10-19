import type { Metadata, Viewport } from "next";
import { Geist_Mono, Quicksand } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

import { Providers } from "@/components/Providers";

// Full Inter (not the Google subset) because the arrows, check marks and shapes we use are outside "latin".
const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description = "A fun, collaborative, and AI-enabled K-12 coding classroom";

// Link previews (Discord, iMessage, Slack...) need absolute URLs, so the preview image resolves
// against the live domain. The image itself is app/opengraph-image.tsx.
export const metadata: Metadata = {
  metadataBase: new URL("https://helpity.app"),
  title: "Helpity",
  description,
  openGraph: {
    title: "Helpity",
    description,
    url: "/",
    siteName: "Helpity",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Helpity",
    description,
  },
};

// Phones: draw under the notch/home-indicator areas (padded with env(safe-area-inset-*) where it
// matters), and shrink the layout above the on-screen keyboard so the code stays visible.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
