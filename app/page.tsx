import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ServicesGrid from "@/components/ServicesGrid";
import Features from "@/components/Features";
import HomeContent from "@/components/HomeContent";
import UsagePlans from "@/components/UsagePlans";
import Footer from "@/components/Footer";
import { getFAQSchema } from "@/lib/schema";

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

const FAQS = [
  {
      q: "Is PDF Maya really free?",
      a: "Yes. The majority of our tools - including editing, merging, splitting, compressing, and converting - are free to use without creating an account. We don't add watermarks to output files on our free tools.",
  },
  {
      q: "Can I edit text in a scanned PDF?",
      a: "Yes. First run the file through our OCR PDF tool. Once OCR is applied, the text in the scanned document becomes selectable and searchable. You can then open it in the Edit PDF tool to make changes.",
  },
  {
      q: "How much can I compress a PDF?",
      a: "It varies depending on how image-heavy the file is. Our compressor optimises embedded images and removes redundant data. Files with lots of high-resolution scans typically see the biggest size reduction.",
  },
  {
      q: "Is it safe to upload sensitive documents?",
      a: "All file transfers use SSL encryption. Files are processed on our secure backend and deleted after your session. We do not read, index, or store the contents of your documents.",
  },
  {
      q: "Can I sign a PDF from my phone?",
      a: "Yes. PDF Maya is fully responsive and works in any modern mobile browser. You can draw a signature with your finger, type one, or upload an existing signature image.",
  },
  {
      q: "Does converting from PDF preserve formatting?",
      a: "Our conversion engine makes a strong effort to preserve tables, headings, fonts, and images. Very complex layouts may need minor touch-ups, but the result is far faster to work with than starting from scratch.",
  },
  {
      q: "Do I need to sign up?",
      a: "No account is required for most tools. You can get started immediately. Creating a free account unlocks saved preferences and slightly higher usage limits on compute-intensive tasks like OCR and conversion.",
  },
];

export default function Home() {
  const faqSchema = getFAQSchema(FAQS);

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
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

