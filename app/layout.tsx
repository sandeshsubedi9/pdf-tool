import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/AuthProvider";
import { FingerprintProvider } from "@/components/FingerprintProvider";
import { getOrganizationSchema, getWebSiteSchema, BASE_URL } from "@/lib/schem";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "PDF Maya – Every PDF Tool in One Place",
    template: "%s | PDF Maya",
  },
  description:
    "Edit, Merge, split, compress, convert, sign and do much more with PDFs. Free, fast, and easy to use – PDF Maya has every PDF tool at your fingertips.",
  keywords: "PDF editor, merge PDF, split PDF, compress PDF, convert PDF, PDF tools, crop PDF, watermark PDF, OCR PDF, redact PDF, sign PDF, extract images, protect PDF, translate PDF, repair PDF, PDF to Word, Word to PDF, Excel to PDF",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "PDF Maya",
    title: "PDF Maya – Every PDF Tool in One Place",
    description: "The ultimate collection of PDF tools. Edit, convert, merge and more for free.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PDF Maya - All Your PDF Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Maya – Every PDF Tool in One Place",
    description: "The ultimate collection of PDF tools. Edit, convert, merge and more for free.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgSchema = getOrganizationSchema();
  const siteSchema = getWebSiteSchema();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <FingerprintProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "#ffffff",
                  color: "#1a1a1a",
                  borderRadius: "12px",
                  padding: "12px 20px",
                  fontSize: "14px",
                  fontWeight: "500",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #e5e7eb",
                },
                success: {
                  iconTheme: {
                    primary: "#047C58",
                    secondary: "#ffffff",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#dc2626",
                    secondary: "#ffffff",
                  },
                },
              }}
            />
          </FingerprintProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

