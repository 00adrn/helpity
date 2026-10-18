import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Helpity",
  description: "A live coding classroom for kids, with a little helper named Helpity.",
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
