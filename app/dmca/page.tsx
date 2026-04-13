import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Copyright & DMCA Policy – SandeshPDF",
  description:
    "SandeshPDF respects intellectual property rights. Learn how to submit a copyright notice or DMCA counter-notice.",
};

export default function DmcaPolicy() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="mb-10">
          <p className="text-sm font-medium text-[#8C886B] mb-2 uppercase tracking-widest">
            Last Updated: January 6, 2026
          </p>
          <h1 className="text-4xl font-bold text-[#1E1702] mb-4">
            Copyright &amp; DMCA Policy
          </h1>
          <p className="text-[#8C886B] leading-relaxed text-lg">
            SandeshPDF respects intellectual property rights and expects users to
            do the same. If you believe content processed, stored, displayed, or
            made available through SandeshPDF infringes your copyright, you may
            send a written notice to SandeshPDF&apos;s designated copyright
            contact.
          </p>
        </div>

        <div className="space-y-10 text-[#8C886B] leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              1. Required Information for a Notice
            </h2>
            <p className="mb-4">
              A valid copyright complaint should include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                A physical or electronic signature of the copyright owner or
                authorized representative
              </li>
              <li>
                Identification of the copyrighted work claimed to have been
                infringed
              </li>
              <li>
                Identification of the allegedly infringing material and enough
                information to locate it
              </li>
              <li>
                Contact information for the complaining party, including name,
                address, phone number, and email address
              </li>
              <li>
                A statement that the complaining party has a good-faith belief
                that the use is not authorized
              </li>
              <li>
                A statement that the information in the notice is accurate and,
                where applicable, made under penalty of perjury
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              2. Counter-Notice Process
            </h2>
            <p className="mb-4">
              If you believe material was removed or disabled by mistake or
              misidentification, you may submit a counter-notice. A valid
              counter-notice should generally include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The user&apos;s physical or electronic signature</li>
              <li>
                Identification of the material removed or disabled and where it
                appeared before removal
              </li>
              <li>
                A statement under penalty of perjury that the user has a
                good-faith belief the material was removed due to mistake or
                misidentification
              </li>
              <li>
                The user&apos;s name, address, phone number, and email address
              </li>
              <li>
                Consent to the appropriate legal jurisdiction and acceptance of
                service of process from the original complainant where required
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              3. Repeat Infringers
            </h2>
            <p>
              SandeshPDF may suspend, restrict, or terminate access for users
              who repeatedly upload or process material that infringes the rights
              of others.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              4. Submission Contact
            </h2>
            <p className="mb-2">
              Copyright notices and counter-notices should be sent to:
            </p>
            <p>
              <a
                href="mailto:copyright@SandeshPDF.com"
                className="text-[#047C58] hover:underline font-medium"
              >
                copyright@SandeshPDF.com
              </a>
            </p>
            <p className="mt-2 text-sm">
              Subject line: <span className="font-medium">DMCA Notice</span> or{" "}
              <span className="font-medium">DMCA Counter-Notice</span>
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              5. Important Note
            </h2>
            <p>
              The DMCA is a U.S. law, but a copyright complaint process is still
              useful for non-U.S. services that allow user uploads or user file
              handling.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
