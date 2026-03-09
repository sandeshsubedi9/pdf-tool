"use client";
import React, { useState } from "react";
import { motion } from "motion/react";
import {
    IconFile,
    IconFileArrowRight,
    IconFiles,
    IconScissors,
    IconArrowsJoin2,
    IconLock,
    IconLockOpen,
    IconWriting,
    IconPencil,
    IconDroplet,
    IconRotate,
    IconCrop,
    IconLayersSubtract,
    IconScan,
    IconEye,
    IconFileX,
    IconNumbers,
    IconPhoto,
    IconArrowRight,
    IconFileWord,
    IconPresentation,
    IconTable,
    IconFileTypePdf,
    IconLanguage,
    IconSearch,
    IconFileCheck,
    IconFileCode,
    IconStack,
    IconEraser,
} from "@tabler/icons-react";

type Service = {
    path?: string;
    id?: string;
    title: string;
    description: string;
    icon: React.ElementType;
    category: string;
};

const SERVICES: Service[] = [
    // ── Organise
    { path: "/merge-pdf", title: "Merge PDF", description: "Combine multiple PDFs into one file in any order.", icon: IconArrowsJoin2, category: "Organise" },
    { path: "/split-pdf", title: "Split PDF", description: "Separate a PDF into multiple files by pages.", icon: IconScissors, category: "Organise" },
    { path: "/split-pdf?mode=extract", title: "Extract Pages", description: "Select and extract specific pages from your document.", icon: IconCrop, category: "Organise" },
    { id: "rotate-pdf", title: "Rotate PDF", description: "Rotate pages of your PDF permanently.", icon: IconRotate, category: "Organise" },
    { id: "crop-pdf", title: "Crop PDF", description: "Trim the margins or focus on part of any page.", icon: IconCrop, category: "Organise" },
    { id: "organise-pdf", title: "Organise Pages", description: "Reorder, delete, or duplicate PDF pages.", icon: IconStack, category: "Organise" },
    { id: "remove-pages", title: "Remove Pages", description: "Delete unwanted pages from your document.", icon: IconFileX, category: "Organise" },
    { id: "page-numbers", title: "Page Numbers", description: "Add automatic page numbers to your PDF.", icon: IconNumbers, category: "Organise" },

    // ── Optimise
    { id: "compress-pdf", title: "Compress PDF", description: "Reduce file size while keeping the best quality.", icon: IconLayersSubtract, category: "Optimise" },
    { id: "repair-pdf", title: "Repair PDF", description: "Recover corrupted or damaged PDF files.", icon: IconFileCheck, category: "Optimise" },
    { id: "ocr-pdf", title: "OCR PDF", description: "Make scanned text searchable and selectable.", icon: IconScan, category: "Optimise" },

    // ── Convert FROM PDF
    { path: "/pdf-to-word", title: "PDF to Word", description: "Convert PDF files to editable Word documents.", icon: IconFileWord, category: "Convert" },
    { path: "/pdf-to-excel", title: "PDF to Excel", description: "Turn PDF data into spreadsheets.", icon: IconTable, category: "Convert" },
    { path: "/pdf-to-pptx", title: "PDF to PowerPoint", description: "Export PDF pages as editable slides.", icon: IconPresentation, category: "Convert" },
    { path: "/pdf-to-jpg", title: "PDF to JPG", description: "Convert pages to JPG or extract embedded images from your PDF.", icon: IconPhoto, category: "Convert" },
    { path: "/pdf-to-epub", title: "PDF to ePub", description: "Convert PDF into an e-book format.", icon: IconFile, category: "Convert" },
    { path: "/pdf-to-pdfa", title: "PDF to PDF/A", description: "Archive PDFs with ISO-standardised format.", icon: IconFileTypePdf, category: "Convert" },
    { path: "/pdf-to-txt", title: "PDF to Text", description: "Extract raw text content from PDF files.", icon: IconFileCode, category: "Convert" },

    // ── Convert TO PDF
    { path: "/word-to-pdf", title: "Word to PDF", description: "Convert Word docs to PDF perfectly preserved.", icon: IconFileArrowRight, category: "Convert" },
    { path: "/excel-to-pdf", title: "Excel to PDF", description: "Turn spreadsheets into polished PDF files.", icon: IconFileArrowRight, category: "Convert" },
    { path: "/pptx-to-pdf", title: "PowerPoint to PDF", description: "Save your presentation as a PDF.", icon: IconFileArrowRight, category: "Convert" },
    { path: "/jpg-to-pdf", title: "Image to PDF", description: "Convert JPG, PNG, WebP and other images into PDF.", icon: IconFileArrowRight, category: "Convert" },
    { path: "/html-to-pdf", title: "HTML to PDF", description: "Convert a webpage URL into a PDF document.", icon: IconFileArrowRight, category: "Convert" },

    // ── Edit
    { id: "edit-pdf", title: "Edit PDF", description: "Add text, images, shapes and annotations.", icon: IconPencil, category: "Edit" },
    { id: "sign-pdf", title: "Sign PDF", description: "Draw, type or upload your signature.", icon: IconWriting, category: "Edit" },
    { id: "watermark-pdf", title: "Watermark", description: "Stamp a text or image watermark onto pages.", icon: IconDroplet, category: "Edit" },
    { id: "redact-pdf", title: "Redact PDF", description: "Permanently black out sensitive content.", icon: IconEraser, category: "Edit" },
    { id: "compare-pdf", title: "Compare PDF", description: "Highlight the differences between two PDFs.", icon: IconEye, category: "Edit" },
    { id: "translate-pdf", title: "Translate PDF", description: "Translate your PDF to another language.", icon: IconLanguage, category: "Edit" },

    // ── Security
    { id: "protect-pdf", title: "Protect PDF", description: "Encrypt your PDF with a password.", icon: IconLock, category: "Security" },
    { id: "unlock-pdf", title: "Unlock PDF", description: "Remove password protection from a PDF.", icon: IconLockOpen, category: "Security" },

    // ── Extras
    { id: "scan-to-pdf", title: "Scan to PDF", description: "Use your camera to scan a document to PDF.", icon: IconScan, category: "Extras" },
    { id: "extract-images", title: "Extract Images", description: "Pull all images out of a PDF document.", icon: IconPhoto, category: "Extras" },
    { id: "search-pdf", title: "Search PDF", description: "Find and highlight text across your PDF.", icon: IconSearch, category: "Extras" },
    { id: "flatten-pdf", title: "Flatten PDF", description: "Merge form fields and annotations into the page.", icon: IconFiles, category: "Extras" },
];

const CATEGORIES = ["All", "Organise", "Optimise", "Convert", "Edit", "Security", "Extras"];

// Teal variants for the icon background (cycling through brand-friendly shades)
const ICON_VARIANTS = [
    { bg: "#e6f4ef", color: "#047C58" },
    { bg: "#f0ede4", color: "#8C886B" },
    { bg: "#ede9de", color: "#342005" },
    { bg: "#e6f4ef", color: "#047C58" },
];

export default function ServicesGrid() {
    const [active, setActive] = useState("All");

    const filtered =
        active === "All" ? SERVICES : SERVICES.filter((s) => s.category === active);

    return (
        <section id="services" className="py-24 px-5 md:px-8" style={{ background: "#F7F6F3" }}>
            <div className="max-w-7xl mx-auto">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <p className="text-xs font-semibold tracking-widest uppercase text-brand-teal mb-3">
                        30+ Tools
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-brand-dark">
                        Everything you need to work with PDFs
                    </h2>
                    <p className="mt-3 text-brand-sage text-lg max-w-xl mx-auto">
                        All tools are 100% free and require no sign-up. Pick a tool and get
                        started in seconds.
                    </p>
                </motion.div>

                {/* Category filter tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-10">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            id={`filter-${cat.toLowerCase()}`}
                            onClick={() => setActive(cat)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border cursor-pointer shadow-sm active:scale-[0.98] ${active === cat
                                ? "bg-brand-teal text-white border-brand-teal shadow-md"
                                : "bg-white text-brand-dark border-border hover:border-brand-sage"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((service, i) => {
                        const variant = ICON_VARIANTS[i % ICON_VARIANTS.length];
                        const Icon = service.icon;
                        return (
                            <motion.a
                                key={service.id || service.title.replace(/\s+/g, '-').toLowerCase()}
                                href={service.path || `#${service.id || "tool"}`}
                                id={`service-${service.id || service.title.replace(/\s+/g, '-').toLowerCase()}`}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.35, delay: (i % 8) * 0.04 }}
                                className="group flex flex-col gap-3 p-5 bg-white rounded-2xl border border-border hover:border-brand-teal hover:shadow-xl transition-all duration-200 cursor-pointer shadow-md"
                            >
                                {/* Icon */}
                                <span
                                    className="flex items-center justify-center w-10 h-10 rounded-xl text-lg transition-transform duration-200 group-hover:scale-110"
                                    style={{ background: variant.bg, color: variant.color }}
                                >
                                    <Icon size={20} stroke={1.8} />
                                </span>

                                {/* Text */}
                                <div>
                                    <p className="font-semibold text-sm text-brand-dark group-hover:text-brand-teal transition-colors">
                                        {service.title}
                                    </p>
                                    <p className="text-xs text-brand-sage mt-0.5 leading-relaxed">
                                        {service.description}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <span className="mt-auto flex items-center gap-1 text-xs font-medium text-brand-teal opacity-0 group-hover:opacity-100 transition-opacity">
                                    Use tool <IconArrowRight size={13} />
                                </span>
                            </motion.a>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
