"use client";
import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { FileUpload } from "@/components/ui/file-upload";
import {
    IconFileTypePdf,
    IconLoader2,
    IconCheck,
    IconInfoCircle,
    IconAlertTriangle,
} from "@tabler/icons-react";
import { pdfToPdfa, downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";
import { motion } from "motion/react";

type Level = "1b" | "2b" | "3b";

const LEVELS: {
    value: Level;
    label: string;
    badge: string;
    badgeColor: string;
    description: string;
    features: string[];
    since: string;
    recommended?: boolean;
}[] = [
        {
            value: "1b",
            label: "PDF/A-1b",
            badge: "Most Compatible",
            badgeColor: "bg-green-100 text-green-700",
            since: "PDF 1.4 : ISO 19005-1:2005",
            description:
                "The widest-supported archival format. Guarantees visual reproduction of the document for long-term archiving. Ideal for legal, government, and regulated industries.",
            features: [
                "Embedded fonts & colour profiles (OutputIntent)",
                "No JavaScript, encryption, or multimedia",
                "No external file references or links to resources",
                "Maximum viewer compatibility (Acrobat 5+)",
            ],
            recommended: true,
        },
        {
            value: "2b",
            label: "PDF/A-2b",
            badge: "Modern Features",
            badgeColor: "bg-blue-100 text-blue-700",
            since: "PDF 1.7 : ISO 19005-2:2011",
            description:
                "Adds modern PDF capabilities, including transparency, JPEG 2000 compression, and layers, while maintaining archival integrity. Better compression than PDF/A-1b.",
            features: [
                "Everything in PDF/A-1b",
                "Transparency effects & layer support (OCG)",
                "JPEG 2000 image compression (smaller file sizes)",
                "Embedding of OpenType fonts",
                "Digital signatures (PAdES)",
            ],
        },
        {
            value: "3b",
            label: "PDF/A-3b",
            badge: "File Attachments",
            badgeColor: "bg-purple-100 text-purple-700",
            since: "PDF 1.7 : ISO 19005-3:2012",
            description:
                "Extends PDF/A-2b by allowing any file type (XML, CSV, Excel, etc.) to be embedded as an attachment within the PDF. Perfect for hybrid invoice and reporting formats.",
            features: [
                "Everything in PDF/A-2b",
                "Embed any file type (XML, CSV, XLS, etc.)",
                "Used in ZUGFeRD, Factur-X invoice standards",
                "Suitable for complex archival document sets",
            ],
        },
    ];

const DISCLAIMER_ITEMS = [
    "Interactive JavaScript or form actions will be removed",
    "Embedded multimedia (video, audio) will be stripped",
    "External hyperlinks are kept but may not persist forever",
    "Transparency & gradients may be flattened in PDF/A-1b mode",
    "Encrypted or password-protected PDFs cannot be converted",
    "All fonts will be embedded (may slightly increase file size)",
];

export default function PdfToPdfaPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<Level>("1b");

    const selectedInfo = LEVELS.find((l) => l.value === selectedLevel)!;

    const handleConvert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setSuccess(false);

        const toastId = toast.loading(`Converting to PDF/A-${selectedLevel.toUpperCase()}...`);

        try {
            const blob = await pdfToPdfa(files[0], selectedLevel);
            const newName = files[0].name.replace(/\.pdf$/i, "_pdfa.pdf");
            downloadBlob(blob, newName);
            setSuccess(true);
            toast.success(`Converted to PDF/A-${selectedLevel.toUpperCase()} successfully!`, { id: toastId });
        } catch (err: any) {
            const isDev = process.env.NODE_ENV === "development";
            if (isDev) console.error(err);
            const rawMsg = err?.message || "Unknown error";
            toast.error(isDev ? `Error: ${rawMsg}` : "Failed to convert to PDF/A.", { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--brand-white)" }}>
            <Navbar />

            {/* Subtle background accents */}
            <div aria-hidden className="pointer-events-none absolute right-0 top-0 w-1/2 h-full opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 80% 50%, #1D4ED8 0%, transparent 60%)` }} />
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, #8C886B 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.05 }} />

            <main className="flex-1 max-w-7xl mx-auto px-5 md:px-8 w-full py-28 md:py-36 relative z-10 flex flex-col gap-12">

                {/* ── CENTERED HEADER ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-3xl mx-auto flex flex-col items-center gap-4"
                >
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1D4ED8] text-white shadow-lg mb-2">
                        <IconFileTypePdf size={32} stroke={1.5} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold leading-tight text-brand-dark tracking-tight">
                        Convert PDF to PDF/A
                    </h1>
                    <p className="text-lg text-brand-sage leading-relaxed">
                        Archive your PDF with the ISO-standardized PDF/A format. Fully compliant for long-term document preservation and legal standards.
                    </p>
                </motion.div>

                {/* ── DISCLAIMER (Full Width) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-amber-200 bg-amber-50/50 backdrop-blur-sm p-6 md:p-8"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                            <IconAlertTriangle size={22} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-amber-900 mb-3">Important Performance Disclaimers</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-8">
                                {DISCLAIMER_ITEMS.map((item) => (
                                    <div key={item} className="flex items-start gap-2 text-sm text-amber-800/90">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── TWO-COLUMN CONTENT ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* LEFT SIDE: Level Selector and Details (7 cols) */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-7 flex flex-col gap-6"
                    >
                        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-border">
                            <h2 className="text-xl font-bold text-brand-dark mb-1">Set Conformance Level</h2>
                            <p className="text-sm text-brand-sage mb-6">Choose the appropriate archival standard for your requirements.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                {LEVELS.map((level) => (
                                    <button
                                        key={level.value}
                                        onClick={() => setSelectedLevel(level.value)}
                                        className={`relative flex flex-col items-start p-5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer group ${selectedLevel === level.value
                                            ? "border-blue-600 bg-blue-50/50 shadow-md"
                                            : "border-border bg-white hover:border-slate-300 hover:shadow-sm"
                                            }`}
                                    >
                                        {level.recommended && (
                                            <span className="absolute -top-2 -right-2 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-green-600 text-white shadow-sm">
                                                Recommended
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mb-2 uppercase tracking-wider ${level.badgeColor}`}>
                                            {level.badge}
                                        </span>
                                        <span className="text-lg font-bold text-brand-dark group-hover:text-blue-700 transition-colors">
                                            {level.label}
                                        </span>
                                        <span className="text-[10px] text-brand-sage font-medium mt-1">
                                            {level.since}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Detailed Feature Table Replacement */}
                            <div className="rounded-2xl overflow-hidden border border-blue-100 bg-blue-50/30">
                                <div className="bg-blue-600 px-5 py-3 text-white">
                                    <div className="flex items-center gap-2">
                                        <IconInfoCircle size={18} />
                                        <span className="font-bold text-sm tracking-wide uppercase">{selectedInfo.label} Specifications</span>
                                    </div>
                                </div>
                                <div className="p-6 flex flex-col gap-4">
                                    <p className="text-sm text-brand-dark leading-relaxed font-medium">
                                        {selectedInfo.description}
                                    </p>
                                    <div className="h-px bg-blue-100" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                        {selectedInfo.features.map((f) => (
                                            <div key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                                    <IconCheck size={12} className="text-blue-600" stroke={3} />
                                                </div>
                                                {f}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT SIDE: Uploader (5 cols) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-5 flex flex-col gap-6 sticky top-24"
                    >
                        {!success ? (
                            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-border flex flex-col gap-6">
                                <h3 className="text-lg font-bold text-brand-dark">Upload your file</h3>
                                <FileUpload
                                    accept={{ "application/pdf": [".pdf"] }}
                                    multiple={false}
                                    files={files}
                                    setFiles={setFiles}
                                />

                                <button
                                    onClick={handleConvert}
                                    disabled={files.length === 0 || isProcessing}
                                    className={`w-full py-4 text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98] shadow-md ${files.length === 0
                                        ? "bg-[#1D4ED8]/30 cursor-not-allowed shadow-none"
                                        : isProcessing
                                            ? "bg-[#1D4ED8] opacity-50 cursor-wait"
                                            : "bg-[#1D4ED8] hover:bg-blue-700 hover:shadow-blue-200 cursor-pointer"
                                        }`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <IconLoader2 className="animate-spin" size={22} />
                                            <span>Converting to PDF/A-{selectedLevel.toUpperCase()}...</span>
                                        </>
                                    ) : (
                                        <span>Convert to PDF/A-{selectedLevel.toUpperCase()}</span>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-green-100 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-6 shadow-sm">
                                    <IconCheck size={40} stroke={2.5} />
                                </div>
                                <h2 className="text-2xl font-bold text-brand-dark mb-2">Success!</h2>
                                <p className="text-brand-sage mb-6">
                                    Your <span className="font-bold text-brand-dark">PDF/A-{selectedLevel.toUpperCase()}</span> document is ready and downloading.
                                </p>
                                <div className="w-full h-px bg-slate-100 mb-6" />
                                <button
                                    onClick={() => {
                                        setFiles([]);
                                        setSuccess(false);
                                    }}
                                    className="px-8 py-3 rounded-xl bg-white text-black font-medium hover:bg-slate-50 transition-all cursor-pointer shadow-md"
                                >
                                    Convert Another File
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>

        </div>
    );
}
