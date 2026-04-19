"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { FileUpload } from "@/components/ui/file-upload";
import { IconPhoto, IconPhotoSearch } from "@tabler/icons-react";
import { motion } from "motion/react";
import FileStore from "@/lib/file-store";

/* ─────────────────────────────────────────────
   Option Card
───────────────────────────────────────────── */
function OptionCard({
    icon,
    title,
    description,
    color,
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    onClick: () => void;
}) {
    return (
        <motion.button
            whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="flex flex-col items-start gap-4 p-5 rounded-xl border border-slate-100 bg-white shadow-md text-left w-full transition-all duration-200 group cursor-pointer hover:border-slate-200"
        >
            <span
                className="flex items-center justify-center w-12 h-12 rounded-xl text-white shrink-0 transition-transform duration-200 group-hover:scale-110"
                style={{ background: color }}
            >
                {icon}
            </span>
            <div>
                <h3 className="text-base font-bold text-brand-dark transition-colors" style={{ color: "var(--brand-dark)" }}>
                    <span className="group-hover:text-[#EAB308] transition-colors">{title}</span>
                </h3>
                <p className="text-xs text-brand-sage mt-1 leading-relaxed">{description}</p>
            </div>
            <span
                className="mt-auto inline-flex items-center gap-1 text-xs font-bold transition-colors pt-2"
                style={{ color }}
            >
                Select option →
            </span>
        </motion.button>
    );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function PdfToJpgPage() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);

    const goTo = (mode: "convert" | "extract") => {
        if (files.length === 0) return;
        const file = files[0];
        FileStore.setFile("current_pdf", file);
        router.push(`/pdf-to-jpg/${mode}`);
    };

    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Need to share a document as an image? SandeshPDF’s PDF to JPG tool offers a powerful two-in-one solution: instantly convert every page of your PDF into high-resolution JPG files, or extract just the embedded images and photos from inside the document without converting the text.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span><strong>Two-in-One Tool:</strong> Choose to convert entire pages to images or just extract embedded photos.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span><strong>High Resolution:</strong> Convert pages to crisp, clear images that capture every detail.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span><strong>Lossless Extraction:</strong> Pull photos out of the PDF exactly as they were originally uploaded.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span><strong>Zip Export:</strong> Download all your isolated images neatly packaged in a ZIP file.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span>Asset Recovery: Retrieve original photos from presentation slides or brochures.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span>Social Media: Convert informative PDF pages into engaging visual posts.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EAB308]" />
                    <span>Web Design: Repurpose document content for website carousels and portfolios.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Turn your documents into visuals with our PDF to JPG online free tool.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="PDF to JPG - Convert PDF Pages to High-Quality Images"
            description={descriptionContent}
            icon={<IconPhoto size={28} stroke={1.5} />}
            accentColor="#EAB308"
        >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border">
                <FileUpload
                    accept={{ "application/pdf": [".pdf"] }}
                    multiple={false}
                    files={files}
                    setFiles={setFiles}
                />

                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                        className="overflow-hidden"
                    >
                        <p className="text-center text-xs font-semibold text-brand-sage uppercase tracking-widest mb-4">
                            Choose an option
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <OptionCard
                                icon={<IconPhoto size={24} stroke={1.5} />}
                                title="Convert Pages to JPG"
                                description="Turn each PDF page into a high-quality JPG image."
                                color="#EAB308"
                                onClick={() => goTo("convert")}
                            />
                            <OptionCard
                                icon={<IconPhotoSearch size={24} stroke={1.5} />}
                                title="Extract Embedded Images"
                                description="Pull out images embedded inside the PDF file itself."
                                color="#8B5CF6"
                                onClick={() => goTo("extract")}
                            />
                        </div>
                    </motion.div>
                )}
            </div>
        </ToolLayout>
    );
}
