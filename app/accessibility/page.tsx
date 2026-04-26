import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Accessibility Statement – PDF Maya",
  description:
    "PDF Maya is committed to improving website accessibility and usability for all users, including people who use assistive technologies.",
};

export default function AccessibilityStatement() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="mb-10">
          <p className="text-sm font-medium text-[#8C886B] mb-2 uppercase tracking-widest">
            Last Updated: January 6, 2026
          </p>
          <h1 className="text-4xl font-bold text-[#1E1702] mb-4">
            Accessibility Statement
          </h1>
          <p className="text-[#8C886B] leading-relaxed text-lg">
            PDF Maya is committed to improving website accessibility and
            usability for all users, including people who use assistive
            technologies.
          </p>
        </div>

        <div className="space-y-8 text-[#8C886B] leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              Our Commitment
            </h2>
            <p>
              PDF Maya aims to make its content, navigation, and tool
              interfaces as clear, perceivable, and usable as reasonably
              possible. Accessibility is an ongoing effort, and some parts of
              the website may not yet be fully optimized at all times. We
              continuously work to identify and address gaps.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              Reporting an Accessibility Issue
            </h2>
            <p className="mb-4">
              If you encounter an accessibility barrier while using PDF Maya,
              please contact us and include the following information so we can
              review and improve:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The page or tool where you encountered the issue</li>
              <li>A description of the barrier or problem</li>
              <li>The assistive technology or browser you are using</li>
            </ul>
            <p className="mt-4">
              Contact:{" "}
              <a
                href="mailto:accessibility@pdfmaya.com"
                className="text-[#047C58] hover:underline font-medium"
              >
                accessibility@pdfmaya.com
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
