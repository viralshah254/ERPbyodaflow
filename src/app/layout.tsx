import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ODA_BRAND } from "@/lib/brand";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${inter.className} h-full min-h-0 overflow-hidden antialiased`}
      >
        <div
          id="app-root"
          className="flex h-full min-h-0 w-full flex-col overflow-hidden"
        >
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
