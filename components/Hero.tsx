"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/file-upload";
import FileStore from "@/lib/file-store";
import { IconArrowRight, IconShieldCheck, IconBolt, IconCloud } from "@tabler/icons-react";
import { motion } from "motion/react";

const BADGES = [
    { icon: IconShieldCheck, label: "100% Secure" },
    { icon: IconBolt, label: "Lightning Fast" },
    { icon: IconCloud, label: "No Installation" },
];

export default function Hero() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const handleFileSelection = (newFiles: File[]) => {
        if (newFiles.length === 0) return;
        const file = newFiles[0];
        setFiles([file]);
        FileStore.clearFile("edit_pdf_main");
        FileStore.setFile("edit_pdf_main", file);
        router.push("/edit-pdf");
    };

    return (
        <section
            id="hero"
            className="relative min-h-screen flex items-center overflow-hidden pt-12"
            style={{ background: "var(--brand-white)" }}
        >
            {/* Subtle geometric background accent */}
            <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 w-1/2 h-full opacity-[0.04]"
                style={{
                    backgroundImage: `radial-gradient(circle at 80% 50%, #047C58 0%, transparent 60%)`,
                }}
            />
            {/* Dot grid accent */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, #8C886B 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.07,
                }}
            />

            <div className="relative max-w-7xl mx-auto px-5 md:px-8 w-full pt-14 md:pt-20 pb-20 md:pb-28">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* ── LEFT COLUMN ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col gap-7"
                    >
                        {/* Pill badge */}
                        <div className="inline-flex items-center self-start gap-2 px-3 py-1.5 rounded-full bg-brand-teal-lt border border-[#bce0d5] text-xs font-semibold text-brand-teal tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
                            Free Online PDF Tools
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl md:text-5xl xl:text-[3.6rem] font-bold leading-[1.1] tracking-tight text-brand-dark">
                            Every PDF tool
                            <br />
                            you&apos;ll ever need,{" "}
                            <span className="text-brand-teal">in one place.</span>
                        </h1>

                        {/* Sub-copy */}
                        <p className="text-lg text-brand-sage leading-relaxed max-w-md">
                            Merge, split, compress, convert, edit, sign and do much more with
                            your PDF files. Completely free, no software to install.
                        </p>

                        {/* Trust badges */}
                        <div className="flex flex-wrap gap-4">
                            {BADGES.map(({ icon: Icon, label }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-2 text-sm font-medium text-brand-dark"
                                >
                                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-brand-teal-lt text-brand-teal">
                                        <Icon size={15} stroke={2} />
                                    </span>
                                    {label}
                                </div>
                            ))}
                        </div>

                        {/* CTA row */}
                        <div className="flex flex-wrap gap-3 mt-1">
                            <a
                                href="#services"
                                id="hero-cta-primary"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-teal text-white font-semibold text-sm hover:bg-[#036649] transition-all shadow-md cursor-pointer active:scale-[0.98]"
                            >
                                Explore All Tools
                                <IconArrowRight size={16} />
                            </a>
                            <a
                                href="#upload"
                                id="hero-cta-secondary"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-white text-brand-dark font-semibold text-sm hover:border-brand-sage transition-all cursor-pointer shadow-md active:scale-[0.98]"
                            >
                                Upload a PDF
                            </a>
                        </div>

                        {/* Social proof */}
                        <p className="text-xs text-brand-sage">
                            Trusted by{" "}
                            <span className="font-semibold text-brand-dark">50K +</span>{" "}
                            users worldwide · No sign-up required
                        </p>
                    </motion.div>

                    {/* ── RIGHT COLUMN – File Uploader ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.6,
                            ease: [0.22, 1, 0.36, 1],
                            delay: 0.15,
                        }}
                        id="upload"
                        className="relative"
                    >
                        {/* Card wrapper */}
                        <div className="relative rounded-2xl border border-border bg-white shadow-[0_8px_40px_rgba(30,23,2,0.09)] overflow-hidden">
                            {/* Card header */}
                            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-[#faf9f7]">
                                <div className="flex gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-[#FFC7C7]" />
                                    <span className="w-3 h-3 rounded-full bg-[#FFE6B3]" />
                                    <span className="w-3 h-3 rounded-full bg-[#C7EACF]" />
                                </div>
                                <span className="text-xs font-medium text-brand-sage ml-2">
                                    Start Editing your PDF
                                </span>
                            </div>

                            {/* Uploader */}
                            <div className="p-6">
                                <FileUpload
                                    accept={{ "application/pdf": [".pdf"] }}
                                    multiple={false}
                                    files={files}
                                    setFiles={setFiles}
                                    onChange={handleFileSelection}
                                    title="Edit your PDF"
                                    description="Drop PDF here or click to start editing"
                                />
                            </div>

                        </div>

                        {/* Floating stats chips */}
                        <div className="absolute -bottom-4 -left-4 hidden lg:flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-[0_4px_20px_rgba(30,23,2,0.12)] border border-border text-xs font-semibold text-brand-dark">
                            <span className="text-brand-teal text-base font-bold">30+</span>
                            PDF Tools
                        </div>
                        <div className="absolute -top-4 -right-4 hidden lg:flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-[0_4px_20px_rgba(30,23,2,0.12)] border border-border text-xs font-semibold text-brand-dark">
                            <span className="text-brand-teal text-base font-bold">100%</span>
                            Free Forever
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
