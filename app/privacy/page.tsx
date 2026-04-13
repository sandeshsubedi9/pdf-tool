import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy – SandeshPDF",
  description:
    "Read how SandeshPDF collects, uses, stores, and protects your information when you use our website and document tools.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        {/* Header */}
        <div className="mb-10">
          <p className="text-sm font-medium text-[#8C886B] mb-2 uppercase tracking-widest">
            Last Updated: January 6, 2026
          </p>
          <h1 className="text-4xl font-bold text-[#1E1702] mb-4">
            Privacy Policy
          </h1>
          <p className="text-[#8C886B] leading-relaxed text-lg">
            This Privacy Policy explains how SandeshPDF collects, uses, stores,
            shares, and protects information when you use the website and its
            document tools.
          </p>
        </div>

        <div className="space-y-10 text-[#8C886B] leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              1. Information SandeshPDF Collects
            </h2>
            <p className="mb-4">
              SandeshPDF may collect the following categories of information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Information you provide directly, such as when you contact
                support or send a message.
              </li>
              <li>
                Technical data such as IP address, browser type, device type,
                operating system, language settings, page interactions,
                timestamps, referral sources, and diagnostic logs.
              </li>
              <li>
                Cookie and similar technology data used for functionality,
                security, analytics, personalization, or advertising where
                applicable.
              </li>
              <li>
                File-related data necessary to process uploaded documents, such
                as file name, file type, size, metadata, page count, and
                temporary processing status.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              2. Uploaded Files
            </h2>
            <p>
              When you upload a file to SandeshPDF, the file may be temporarily
              stored, transmitted, processed, converted, compressed, or otherwise
              handled as necessary to complete the tool action you selected.
              SandeshPDF uses uploaded files only to provide the requested
              service, maintain security, troubleshoot issues, enforce policies,
              and comply with legal obligations.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              3. How Information Is Used
            </h2>
            <p className="mb-4">SandeshPDF may use information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Provide, operate, maintain, and improve the website and its
                tools.
              </li>
              <li>Process files and return requested outputs.</li>
              <li>
                Monitor website performance, reliability, and technical usage.
              </li>
              <li>
                Detect, prevent, and investigate abuse, fraud, malware, or
                security incidents.
              </li>
              <li>
                Communicate with users about support, service updates, legal
                matters, or policy changes.
              </li>
              <li>Comply with legal obligations and enforce agreements.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              4. Cookies and Tracking Technologies
            </h2>
            <p className="mb-4">
              SandeshPDF may use cookies and similar technologies for essential
              website functions, fraud prevention, analytics, preference storage,
              and advertising or measurement where applicable.
            </p>
            <p>
              Users can often control cookies through browser settings, but
              disabling some cookies may affect site functionality.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              5. Sharing of Information
            </h2>
            <p className="mb-4">
              SandeshPDF may share information with:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Hosting and infrastructure providers</li>
              <li>
                File processing, OCR, conversion, or cloud storage vendors
              </li>
              <li>Analytics, security, and error monitoring providers</li>
              <li>
                Professional advisers, legal authorities, or law enforcement
                when required
              </li>
              <li>
                A buyer, investor, or successor in connection with a merger,
                financing, sale, or reorganization
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              6. Data Retention
            </h2>
            <p>
              SandeshPDF keeps personal data and uploaded files only as long as
              reasonably necessary for the purposes described in this Policy,
              including providing services, ensuring security, resolving disputes,
              meeting legal obligations, and enforcing agreements.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              7. Data Security
            </h2>
            <p>
              SandeshPDF uses reasonable administrative, technical, and
              organizational measures to protect data and uploaded files. No
              method of transmission or storage can be guaranteed to be
              completely secure.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              8. International Transfers
            </h2>
            <p>
              If SandeshPDF or its providers process data in countries other than
              the user&apos;s country, information may be transferred
              internationally. Protections may differ by jurisdiction.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              9. Children&apos;s Privacy
            </h2>
            <p>
              SandeshPDF is not intended for children under 13, and SandeshPDF
              does not knowingly collect personal information from children under
              13. Parents or guardians who believe data was collected from a
              child may contact us at the address below.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              10. Your Rights
            </h2>
            <p>
              Depending on where you live, you may have rights to request access
              to, correction of, deletion of, portability of, or restriction of
              your personal data, or to object to certain data processing.
              Contact us below to submit a request.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              11. Policy Updates
            </h2>
            <p>
              SandeshPDF may update this Privacy Policy from time to time.
              Revised versions will be posted with a new &quot;Last
              Updated&quot; date.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              12. Contact
            </h2>
            <p>
              For privacy questions or requests, contact:{" "}
              <a
                href="mailto:privacy@SandeshPDF.com"
                className="text-[#047C58] hover:underline font-medium"
              >
                privacy@SandeshPDF.com
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
