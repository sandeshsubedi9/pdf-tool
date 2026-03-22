import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-4xl font-bold text-[#1E1702] mb-8">Privacy Policy</h1>
        
        <div className="space-y-8 text-[#8C886B] leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-4">1. Data Collection</h2>
            <p>
              We take your privacy seriously. PDFTool does not store your files on our servers longer than necessary to process them. All files are automatically deleted after 2 hours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-4">2. File Security</h2>
            <p>
              Your files are encrypted during transfer using SSL (Secure Socket Layer) technology. We never look into the content of your files, and no one else has access to them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-4">3. Secure Processing</h2>
            <p>
              Your files are processed on our secure servers solely to perform the requested operation. They are never shared, sold, or used for any other purpose. Once processing is complete, files are immediately queued for deletion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-4">4. Cookies</h2>
            <p>
              We use minimal cookies only to improve the user experience and analyze website traffic. We do not use tracking cookies for advertising.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
