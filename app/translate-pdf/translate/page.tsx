"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconLoader2,
    IconArrowLeft,
    IconDownload,
    IconLanguage,
    IconCheck,
    IconChevronDown,
} from "@tabler/icons-react";
import { downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
import toast from "react-hot-toast";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

const LANGUAGES = [
    { label: "Arabic", code: "ar" },
    { label: "Bulgarian", code: "bg" },
    { label: "Chinese - Simplified", code: "zh-CN" },
    { label: "Danish", code: "da" },
    { label: "Dutch", code: "nl" },
    { label: "English", code: "en" },
    { label: "Finnish", code: "fi" },
    { label: "French", code: "fr" },
    { label: "German", code: "de" },
    { label: "Hindi", code: "hi" },
    { label: "Hungarian", code: "hu" },
    { label: "Italian", code: "it" },
    { label: "Japanese", code: "ja" },
    { label: "Korean", code: "ko" },
    { label: "Persian", code: "fa" },
    { label: "Polish", code: "pl" },
    { label: "Portuguese", code: "pt" },
    { label: "Russian", code: "ru" },
    { label: "Spanish", code: "es" },
    { label: "Swahili", code: "sw" },
    { label: "Swedish", code: "sv" },
    { label: "Thai", code: "th" },
    { label: "Turkish", code: "tr" },
    { label: "Ukrainian", code: "uk" },
    { label: "Vietnamese", code: "vi" },
];

export default function TranslatePdfToolPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    // Language dropdown state
    const [targetLang, setTargetLang] = useState(LANGUAGES.find(l => l.code === "en")!);
    const [langOpen, setLangOpen] = useState(false);
    const [pageCount, setPageCount] = useState<number | null>(null);

    const { execute, limitResult: rateLimitResult, clearLimitResult } = useRateLimitedAction();

    // Load file from FileStore and get page count
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const f = FileStore.getFile("translate_0");
        if (!f) {
            router.replace("/translate-pdf");
            return;
        }
        setFile(f);

        const loadPdf = async () => {
            try {
                const pdfjs = await import("pdfjs-dist");
                pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

                const arrayBuffer = await f.arrayBuffer();
                const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
                setPageCount(pdf.numPages);
            } catch (err) {
                console.error("Error loading PDF for page count:", err);
            }
        };
        loadPdf();
    }, [router]);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const handleTranslate = async () => {
        if (!file) return;
        setIsProcessing(true);

        execute(async () => {
            const toastId = toast.loading("Processing translation...");

            try {
                const formData = new FormData();
                formData.append("file", file, file.name);
                formData.append("target_lang", targetLang.code);

                const res = await fetch("/api/translate-pdf", {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    const technicalError = errorData.error || errorData.detail || "Unknown error";
                    console.error("Backend Error Details:", technicalError);

                    let userMessage = "Something went wrong during translation. Please try again.";
                    if (technicalError.includes("Layout Extraction")) {
                        userMessage = "We couldn't process this PDF's layout. It might be too complex.";
                    } else if (technicalError.includes("Cloud Translation")) {
                        userMessage = "The translation service is currently busy. Please try again in a moment.";
                    } else if (technicalError.includes("LibreOffice") || technicalError.includes("PDF Generation")) {
                        userMessage = "We encountered an issue rebuilding your PDF. Please try a different file.";
                    }

                    toast.error(userMessage, { id: toastId });
                    return;
                }

                const blob = await res.blob();
                const outName =
                    res.headers.get("X-Original-Filename") ||
                    file.name.replace(/\.pdf$/i, `_${targetLang.code}.pdf`);

                downloadBlob(blob, outName);
                setSuccess(true);
                toast.success("Translation complete!", { id: toastId });
            } catch (err: any) {
                console.error("Translation Error Trace:", err);
                toast.error("A network error occurred. Please check your connection.", { id: toastId });
            } finally {
                setIsProcessing(false);
            }
        });
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col bg-[#F7F6F3]">
                <Navbar />
                <main className="flex-1 flex items-center justify-center p-6 mt-16">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-border max-w-lg w-full text-center"
                    >
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <IconCheck size={32} className="text-emerald-500" stroke={2} />
                        </div>
                        <h2 className="text-xl font-bold text-brand-dark mb-4">
                            Translation Complete!
                        </h2>
                        <p className="text-brand-sage text-sm mb-8 px-4">
                            Your translated PDF has been downloaded. The layout and formatting were preserved automatically.
                        </p>
                        <button
                            onClick={() => router.push("/translate-pdf")}
                            className="bg-[#059669] text-white px-8 py-3 rounded-full font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg w-full text-sm"
                        >
                            Translate Another PDF
                        </button>
                    </motion.div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#F7F6F3] pt-[64px]">
            <Navbar />

            <main className="flex-1 flex flex-col items-center justify-center p-4 py-8">
                <div className="w-full max-w-lg">
                    <div className="bg-white rounded-[24px] p-8 md:p-12 shadow-xl shadow-emerald-900/5 border border-border text-center relative min-h-[560px] flex flex-col justify-center overflow-hidden">
                        {/* Back Button - Inside Card */}
                        <button
                            onClick={() => router.push("/translate-pdf")}
                            className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-50 text-brand-sage hover:text-brand-dark transition-all z-20"
                            title="Back"
                        >
                            <IconArrowLeft size={18} />
                        </button>

                        {/* Title Section */}
                        <div className="mb-6 pt-2">
                            <div className="w-12 h-12 bg-emerald-50 text-[#059669] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <IconLanguage size={24} stroke={2} />
                            </div>
                            <h1 className="text-2xl font-black text-brand-dark mb-2">Translate PDF</h1>
                            <p className="text-brand-sage text-xs font-semibold px-8 leading-relaxed">
                                Select the language you want your document to be translated to.
                            </p>
                        </div>

                        {/* File Details Bar - More Compact */}
                        <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl p-3 border border-slate-100 mb-8 flex items-center justify-between gap-4 text-left">
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-brand-sage uppercase tracking-widest mb-0.5">File Name</p>
                                <p className="text-xs font-bold text-brand-dark truncate pr-2" title={file?.name}>
                                    {file?.name}
                                </p>
                            </div>
                            <div className="flex items-center gap-6 shrink-0">
                                <div>
                                    <p className="text-[9px] font-black text-brand-sage uppercase tracking-widest mb-0.5">Size</p>
                                    <p className="text-xs font-bold text-brand-dark">
                                        {file ? formatSize(file.size) : "-"}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-brand-sage uppercase tracking-widest mb-0.5">Pages</p>
                                    <p className="text-xs font-bold text-brand-dark">
                                        {pageCount !== null ? pageCount : <IconLoader2 size={10} className="animate-spin" />}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Dropdown Section - Full Width */}
                        <div className="relative mb-8 text-left w-full">
                            <label className="block text-[10px] font-black text-brand-sage uppercase tracking-widest mb-3 ml-1">Target Language</label>
                            <button
                                onClick={() => setLangOpen((o) => !o)}
                                disabled={isProcessing}
                                className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 text-sm font-bold transition-all focus:outline-none focus:ring-4 focus:ring-[#059669]/5 ${langOpen ? "border-[#059669] bg-emerald-50/20 text-[#059669]" : "border-slate-100 bg-slate-50 hover:border-[#059669]/20 text-brand-dark"
                                    } disabled:opacity-50`}
                            >
                                <span>{targetLang.label}</span>
                                <IconChevronDown size={16} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
                            </button>

                            <AnimatePresence>
                                {langOpen && (
                                    <motion.ul
                                        initial={{ opacity: 0, y: 4, scale: 0.99 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: 0.99 }}
                                        className="absolute z-50 bottom-full mb-2 left-0 right-0 bg-white border border-border rounded-xl shadow-2xl overflow-y-auto max-h-48 custom-scrollbar p-1.5"
                                    >
                                        {LANGUAGES.map((lang) => (
                                            <li
                                                key={lang.code}
                                                onClick={() => {
                                                    setTargetLang(lang);
                                                    setLangOpen(false);
                                                }}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all mb-0.5 last:mb-0 ${targetLang.code === lang.code
                                                        ? "bg-[#059669] text-white"
                                                        : "text-brand-dark hover:bg-emerald-50 hover:text-[#059669]"
                                                    }`}
                                            >
                                                {lang.label}
                                            </li>
                                        ))}
                                    </motion.ul>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Action Section */}
                        <div className="space-y-3 pt-2">
                            <button
                                onClick={handleTranslate}
                                disabled={isProcessing}
                                className="w-full bg-[#059669] text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                            >
                                {isProcessing ? (
                                    <>
                                        <IconLoader2 size={18} className="animate-spin" /> Translating...
                                    </>
                                ) : (
                                    <>
                                        <IconDownload size={18} stroke={2.5} /> Translate PDF
                                    </>
                                )}
                            </button>
                            {isProcessing && (
                                <p className="text-center text-[11px] font-medium text-brand-sage animate-pulse leading-relaxed">
                                    Don't close the browser tab. This may take a few moments.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <RateLimitModal
                open={!!rateLimitResult}
                resetAt={rateLimitResult?.resetAt ?? 0}
                onClose={clearLimitResult}
            />
        </div>
    );
}
