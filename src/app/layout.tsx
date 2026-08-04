import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ODA_BRAND } from "@/lib/brand";

const inter = localFont({
  src: "../fonts/inter-latin-wght-normal.woff2",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ERP by OdaFlow",
  description: "Multi-tenant ERP for Manufacturers, Distributors, and Shops",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "1024x1024" }],
    apple: [{ url: "/favicon.png", type: "image/png", sizes: "1024x1024" }],
  },
};

export const viewport: Viewport = {
  themeColor: ODA_BRAND.navy,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <div id="app-root">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
