import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Disclaimer – SandeshPDF",
  description:
    "Read the SandeshPDF disclaimer. SandeshPDF provides online PDF and document tools for general informational and utility purposes only.",
};

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="mb-10">
          <p className="text-sm font-medium text-[#8C886B] mb-2 uppercase tracking-widest">
            Last Updated: January 6, 2026
          </p>
          <h1 className="text-4xl font-bold text-[#1E1702] mb-4">
            Disclaimer
          </h1>
        </div>

        <div className="space-y-6 text-[#8C886B] leading-relaxed">
          <p>
            SandeshPDF provides online PDF and document tools for general
            informational and utility purposes only. Although SandeshPDF aims to
            provide reliable tools and accurate outputs, no guarantee is made
            that the website, its tools, or any output files will always be
            complete, secure, accurate, error-free, or suitable for every
            professional, legal, financial, governmental, or archival purpose.
          </p>
          <p>
            Document conversions, OCR output, file repair, compression quality,
            editable text extraction, form rendering, and signature-related
            features may vary depending on source file quality, embedded fonts,
            structure, corruption, scan quality, encryption, and browser or
            device limitations.
          </p>
          <p>
            You are solely responsible for reviewing any output produced through
            SandeshPDF before relying on it, filing it, sharing it, printing it,
            signing it, or submitting it to any employer, client, school, court,
            government office, bank, or other third party.
          </p>
          <p>
            SandeshPDF does not provide legal advice, accounting advice,
            compliance advice, records-retention advice, or
            document-authentication services. Use of the website is at your own
            risk.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
