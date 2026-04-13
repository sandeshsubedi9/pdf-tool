import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Terms of Service – SandeshPDF",
  description:
    "Read the Terms of Service for SandeshPDF. These terms govern your access to and use of SandeshPDF and all related tools, features, content, and services.",
};

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="text-[#8C886B] leading-relaxed text-lg">
            Welcome to SandeshPDF. These Terms of Service govern your access to
            and use of SandeshPDF and all related tools, features, content, and
            services available through the website. By using SandeshPDF, you
            agree to these Terms. If you do not agree, you must not use the
            website.
          </p>
        </div>

        <div className="space-y-10 text-[#8C886B] leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              1. About SandeshPDF
            </h2>
            <p>
              SandeshPDF is an online document tool website that may allow users
              to compress PDFs, edit PDFs, merge files, split files, convert
              between formats, add signatures, create fillable forms, and perform
              other document-related actions through a browser-based interface.
              The website is provided for general informational, personal,
              business, and productivity use, subject to these Terms.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              2. Eligibility
            </h2>
            <p>
              You may use SandeshPDF only if you are legally able to enter into a
              binding agreement under the laws that apply to you. If you are
              under the age of majority in your jurisdiction, you may use
              SandeshPDF only with permission and supervision from a parent or
              legal guardian.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              3. User Files and Content
            </h2>
            <p className="mb-4">
              When you upload, submit, import, or process any file through
              SandeshPDF, you represent and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You own the file or have all necessary rights and permissions to
                use it.
              </li>
              <li>
                Your use of the file does not violate any law, contract, privacy
                right, publicity right, copyright, trademark, or other
                third-party right.
              </li>
              <li>
                The file does not contain malicious code, malware, scripts, or
                anything else intended to interfere with systems, data, or users.
              </li>
            </ul>
            <p className="mt-4">
              You retain ownership of your files. SandeshPDF does not claim
              ownership of user-uploaded documents. However, you grant SandeshPDF
              a limited, non-exclusive, revocable right to host, process,
              transmit, convert, compress, store temporarily, and otherwise
              handle your files only as necessary to provide the requested
              service and maintain website security and operations.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              4. Acceptable Use
            </h2>
            <p className="mb-4">
              You agree not to use SandeshPDF to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload or process files you do not have the right to use.</li>
              <li>
                Upload illegal, infringing, defamatory, abusive, fraudulent, or
                harmful material.
              </li>
              <li>
                Upload executable, dangerous, or disguised files intended to
                bypass file restrictions.
              </li>
              <li>
                Attempt to reverse engineer, disrupt, overload, scrape, or
                interfere with the website.
              </li>
              <li>
                Access or use SandeshPDF through abusive bots, scripts, or
                automated systems that harm service availability.
              </li>
              <li>
                Circumvent technical limits, upload controls, storage limits, or
                security features.
              </li>
            </ul>
            <p className="mt-4">
              SandeshPDF may suspend, restrict, or terminate access if it
              believes a user has violated these Terms, created legal risk, abused
              the website, or threatened system integrity.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              5. File Upload and Security Rules
            </h2>
            <p className="mb-4">
              To help protect the website and its users, SandeshPDF may restrict
              accepted file types, file sizes, upload volume, storage periods,
              and processing limits. Restricting uploads to approved file types
              and applying size limits are standard file-upload security
              practices.
            </p>
            <p>
              SandeshPDF may scan files, block suspicious uploads, refuse
              processing requests, or delete files that appear unsafe, unlawful,
              corrupted, unsupported, or abusive. These actions may be taken
              automatically or manually for security, compliance, or operational
              reasons.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              6. No Guarantee of Results
            </h2>
            <p className="mb-4">
              SandeshPDF aims to provide useful and reliable document-processing
              tools, but it does not guarantee that every output will be
              error-free, perfectly formatted, fully editable, or suitable for
              every legal, commercial, archival, or technical purpose. Results
              may vary depending on file quality, structure, password protection,
              source formatting, OCR limitations, browser compatibility, and the
              nature of the selected tool.
            </p>
            <p>
              You are responsible for reviewing all output files before using,
              sharing, printing, filing, or relying on them.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              7. Availability
            </h2>
            <p>
              SandeshPDF may change, suspend, limit, or discontinue any feature,
              tool, or part of the website at any time, with or without notice.
              Access may also be interrupted by maintenance, updates, technical
              failures, security events, or third-party service issues.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              8. Intellectual Property
            </h2>
            <p>
              All content and materials on SandeshPDF, excluding user-uploaded
              files — including software, branding, design, logos, text, layout,
              graphics, tool logic, and website content — are owned by or
              licensed to SandeshPDF and are protected by applicable intellectual
              property laws. You may not copy, reproduce, distribute, modify,
              sell, license, or exploit any portion of SandeshPDF except as
              expressly permitted in writing.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              9. Third-Party Services
            </h2>
            <p>
              SandeshPDF may rely on third-party hosting, analytics, security,
              advertising, payment, storage, OCR, file-processing, and
              infrastructure providers. These providers may process certain data
              or technical information as part of the service, and their own
              policies and terms may also apply.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              10. Disclaimer of Warranties
            </h2>
            <p>
              SandeshPDF is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis. To the fullest extent permitted by law,
              SandeshPDF disclaims all warranties, express or implied, including
              warranties of merchantability, fitness for a particular purpose,
              accuracy, non-infringement, and uninterrupted or error-free
              operation.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              11. Limitation of Liability
            </h2>
            <p className="mb-4">
              To the fullest extent permitted by law, SandeshPDF and its owners,
              affiliates, service providers, contractors, and licensors will not
              be liable for any indirect, incidental, consequential, special,
              punitive, or exemplary damages, or for any loss of files, content,
              profits, business, revenue, goodwill, or data arising out of or
              related to your use of the website.
            </p>
            <p>
              If liability cannot be excluded, the total liability of SandeshPDF
              for any claim related to the website will be limited to the minimum
              amount permitted by applicable law, and where relevant, no more
              than the amount paid by you, if any, for the specific service at
              issue during the 12 months before the claim arose.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              12. Indemnification
            </h2>
            <p>
              You agree to defend, indemnify, and hold harmless SandeshPDF and
              its owners, affiliates, and service providers from and against
              claims, liabilities, losses, damages, costs, and expenses arising
              from your files, your misuse of the website, your violation of
              these Terms, or your violation of any law or third-party right.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              13. Changes to These Terms
            </h2>
            <p>
              SandeshPDF may update these Terms from time to time. Updated Terms
              will be posted on this page with a revised &quot;Last Updated&quot;
              date. Continued use of SandeshPDF after changes take effect means
              you accept the updated Terms.
            </p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              14. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which
              SandeshPDF operates, without regard to conflict of law rules,
              except where mandatory law requires otherwise.
            </p>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              15. Contact
            </h2>
            <p>
              For legal questions about these Terms, contact:{" "}
              <a
                href="mailto:legal@SandeshPDF.com"
                className="text-[#047C58] hover:underline font-medium"
              >
                legal@SandeshPDF.com
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
