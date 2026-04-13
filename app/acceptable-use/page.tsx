import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Acceptable Use Policy – SandeshPDF",
  description:
    "Read SandeshPDF's Acceptable Use Policy. Learn the rules for using SandeshPDF's tools and infrastructure responsibly.",
};

export default function AcceptableUsePolicy() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="mb-10">
          <p className="text-sm font-medium text-[#8C886B] mb-2 uppercase tracking-widest">
            Last Updated: January 6, 2026
          </p>
          <h1 className="text-4xl font-bold text-[#1E1702] mb-4">
            Acceptable Use Policy
          </h1>
          <p className="text-[#8C886B] leading-relaxed text-lg">
            This Acceptable Use Policy explains the rules for using
            SandeshPDF&apos;s tools and infrastructure. Users may not use
            SandeshPDF to upload, store, convert, edit, merge, sign, or
            distribute files that are unlawful, abusive, harmful, fraudulent,
            infringing, or technically dangerous.
          </p>
        </div>

        <div className="space-y-8 text-[#8C886B] leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              Prohibited Uses
            </h2>
            <p className="mb-4">
              The following activities are strictly prohibited on SandeshPDF:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                Uploading files that infringe copyright, trademark, privacy, or
                confidentiality rights
              </li>
              <li>
                Uploading malware, scripts, executables, or disguised harmful
                files
              </li>
              <li>
                Attempting to bypass file limits, storage limits, or security
                controls
              </li>
              <li>
                Using bots or automated systems in ways that damage service
                quality
              </li>
              <li>
                Processing documents for fraud, impersonation, falsification, or
                unlawful record manipulation
              </li>
              <li>
                Using SandeshPDF to harass, deceive, extort, or facilitate
                unlawful conduct
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              Enforcement
            </h2>
            <p>
              SandeshPDF may block, suspend, remove, refuse, or report content
              or activity that violates this policy. Repeat violations may result
              in permanent termination of access.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
