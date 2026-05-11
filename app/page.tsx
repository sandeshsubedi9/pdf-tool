import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ServicesGrid from "@/components/ServicesGrid";
import Features from "@/components/Features";
import HomeContent from "@/components/HomeContent";
import UsagePlans from "@/components/UsagePlans";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "PDF Maya | 100% Free | All-in-One Online PDF Editor & Converter",
  description: "The world's best free PDF editor. Merge, split, compress, convert, sign and secure PDFs in seconds. No installation required, 100% secure and easy to use.",
  keywords: "free pdf editor, convert pdf to word, merge pdf online, compress pdf, sign pdf, pdf maya, secure pdf tools",
  openGraph: {
    title: "PDF Maya | 100% Free | All-in-One Online PDF Editor & Converter",
    description: "Edit and convert PDFs for free with PDF Maya. Fast, secure, and works in your browser.",
    images: ["/og-image.png"],
  },
  twitter: {
    title: "PDF Maya | 100% Free | All-in-One Online PDF Editor & Converter",
    description: "The ultimate collection of PDF tools. Edit, convert, merge and more for free.",
    images: ["/og-image.png"],
  },
  other: {
    "title": "PDF Maya | 100% Free | All-in-One Online PDF Editor & Converter",
  }
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ServicesGrid />
        <UsagePlans />
        <Features />
        <HomeContent />
      </main>
      <Footer />
    </div>
  );
}

