import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-4xl font-bold text-[#1E1702] mb-8">Terms & Conditions</h1>
        
        <div className="space-y-8 text-[#8C886B] leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-4">1. Acceptance of Terms</h2>
            <p>
              By using PDFTool, you agree to these Terms and Conditions in full. If you disagree, do not use the website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-4">2. Use License</h2>
            <p>
              You are granted a worldwide license to use PDFTool for your own personal and commercial purposes. This license is non-exclusive and non-transferable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-4">3. Limitation of Liability</h2>
            <p>
              PDFTool is provided as-is without any warranties. We are not responsible for any data loss, file corruption, or other damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-4">4. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless PDFTool and its team from any claims, liabilities, or expenses related to your use of this tool.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
