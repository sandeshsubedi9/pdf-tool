import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/AuthProvider";
import { FingerprintProvider } from "@/components/FingerprintProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PDF Maya – Every PDF Tool in One Place",
  description:
    "Merge, split, compress, convert, edit, sign and do much more with PDFs. Free, fast, and easy to use – PDF Maya has every PDF tool at your fingertips.",
  keywords: "PDF editor, merge PDF, split PDF, compress PDF, convert PDF, PDF tools, crop PDF, watermark PDF, OCR PDF, redact PDF, sign PDF, extract images, protect PDF, translate PDF, repair PDF, PDF to Word, Word to PDF, Excel to PDF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {/*
          FingerprintProvider runs silently on every page load:
          1. Calls FingerprintJS to get a stable device ID
          2. POSTs it to /api/init-session → sets a secure HttpOnly cookie
          3. Exposes enforceLimit() and status via useRateLimit() hook
        */}
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

