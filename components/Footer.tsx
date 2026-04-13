"use client";
import React from "react";
import { IconFileText, IconBrandTwitter, IconBrandLinkedin, IconBrandGithub } from "@tabler/icons-react";

const LINKS = {
    Tools: ["Merge PDF", "Split PDF", "Compress PDF", "PDF to Word", "PDF to JPG", "Sign PDF", "Protect PDF", "Unlock PDF"],
    Convert: ["Word to PDF", "Excel to PDF", "JPG to PDF", "PowerPoint to PDF", "HTML to PDF", "ePub to PDF"],
    Legal: [
        { label: "Terms of Service", href: "/terms" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Disclaimer", href: "/disclaimer" },
        { label: "Copyright & DMCA", href: "/dmca" },
        { label: "Acceptable Use", href: "/acceptable-use" },
        { label: "Cookie Policy", href: "/cookies" },
        { label: "Accessibility", href: "/accessibility" },
    ],
    Company: [
        { label: "About Us", href: "#" },
        { label: "Blog", href: "/blog" },
        { label: "Careers", href: "#" },
        { label: "Contact", href: "#" },
    ],
};

export default function Footer() {
    return (
        <footer
            id="footer"
            style={{ background: "var(--brand-brown)", color: "#C9C4B5" }}
            className="pt-16 pb-8 px-5 md:px-8"
        >
            <div className="max-w-max mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#4a3010]">
                    {/* Brand block */}
                    <div className="flex flex-col gap-4">
                        <a href="/" className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-teal text-white">
                                <IconFileText size={18} stroke={2} />
                            </span>
                            <span className="font-bold text-lg text-white">
                                PDF<span className="text-brand-teal">Tool</span>
                            </span>
                        </a>
                        <p className="text-sm leading-relaxed max-w-xs" style={{ color: "#A09888" }}>
                            The fastest and simplest online tool suite for working with PDF
                            files. Completely free, always.
                        </p>
                        {/* Socials */}
                        <div className="flex gap-3 mt-1">
                            {[
                                { icon: IconBrandTwitter, href: "#", label: "Twitter" },
                                { icon: IconBrandLinkedin, href: "#", label: "LinkedIn" },
                                { icon: IconBrandGithub, href: "#", label: "GitHub" },
                            ].map(({ icon: Icon, href, label }) => (
                                <a
                                    key={label}
                                    href={href}
                                    aria-label={label}
                                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#4a3010] transition-colors"
                                    style={{ color: "#C9C4B5" }}
                                >
                                    <Icon size={17} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(LINKS).map(([heading, items]) => (
                        <div key={heading}>
                            <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-4">
                                {heading}
                            </p>
                            <ul className="flex flex-col gap-2.5">
                                {items.map((item) => {
                                    const label = typeof item === "string" ? item : item.label;
                                    const href = typeof item === "string" ? "#" : item.href;
                                    return (
                                        <li key={label}>
                                            <a
                                                href={href}
                                                className="text-sm text-[#A09888] hover:text-[#047C58] transition-colors"
                                            >
                                                {label}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-8 text-xs" style={{ color: "#6B6050" }}>
                    <p>© {new Date().getFullYear()} PDFTool. All rights reserved.</p>
                    <p>Made with care for PDF lovers everywhere.</p>
                </div>
            </div>
        </footer>
    );
}
