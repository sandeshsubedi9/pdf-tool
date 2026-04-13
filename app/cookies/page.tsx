import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Cookie Policy – SandeshPDF",
  description:
    "Learn how SandeshPDF uses cookies and similar technologies to operate the website, remember preferences, and improve performance.",
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="mb-10">
          <p className="text-sm font-medium text-[#8C886B] mb-2 uppercase tracking-widest">
            Last Updated: January 6, 2026
          </p>
          <h1 className="text-4xl font-bold text-[#1E1702] mb-4">
            Cookie Policy
          </h1>
          <p className="text-[#8C886B] leading-relaxed text-lg">
            SandeshPDF may use cookies and similar technologies to operate the
            website, remember preferences, improve performance, provide
            analytics, detect abuse, and, where applicable, support advertising
            and measurement.
          </p>
        </div>

        <div className="space-y-10 text-[#8C886B] leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              Types of Cookies We Use
            </h2>
            <p className="mb-4">
              Cookies used by SandeshPDF may include:
            </p>
            <div className="space-y-4">
              <div className="bg-white border border-[#E8E5D8] rounded-xl p-5">
                <h3 className="font-semibold text-[#1E1702] mb-1">
                  Essential Cookies
                </h3>
                <p className="text-sm">
                  Required for core functionality and security. These cookies
                  cannot be disabled without affecting how the site works.
                </p>
              </div>
              <div className="bg-white border border-[#E8E5D8] rounded-xl p-5">
                <h3 className="font-semibold text-[#1E1702] mb-1">
                  Preference Cookies
                </h3>
                <p className="text-sm">
                  Used to remember your settings and preferences across sessions.
                </p>
              </div>
              <div className="bg-white border border-[#E8E5D8] rounded-xl p-5">
                <h3 className="font-semibold text-[#1E1702] mb-1">
                  Analytics Cookies
                </h3>
                <p className="text-sm">
                  Help us understand how users interact with the site so we can
                  improve tools and the overall experience.
                </p>
              </div>
              <div className="bg-white border border-[#E8E5D8] rounded-xl p-5">
                <h3 className="font-semibold text-[#1E1702] mb-1">
                  Advertising &amp; Measurement Cookies
                </h3>
                <p className="text-sm">
                  May be used if ads or remarketing are active on the website.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              Managing Cookies
            </h2>
            <p>
              Users can manage cookies through browser settings or any cookie
              controls that SandeshPDF may provide. Blocking cookies may affect
              the functionality of some parts of the site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1E1702] mb-3">
              Contact
            </h2>
            <p>
              For questions about our cookie practices, contact:{" "}
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
