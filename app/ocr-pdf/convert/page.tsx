"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion } from "motion/react";
import {
    IconScan,
    IconLoader2,
    IconDownload,
    IconFileTypePdf,
    IconAlertTriangle,
    IconCheck,
    IconInfoCircle,
    IconRefresh,
    IconLanguage,
} from "@tabler/icons-react";
import { ocrPdf, OcrResult, downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
import toast from "react-hot-toast";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

// ── Supported Tesseract language options ──────────────────────────────────────
const LANGUAGES = [
    { value: "eng",         label: "English" },
    { value: "fra",         label: "French" },
    { value: "deu",         label: "German" },
    { value: "spa",         label: "Spanish" },
    { value: "por",         label: "Portuguese" },
    { value: "ita",         label: "Italian" },
    { value: "nld",         label: "Dutch" },
    { value: "rus",         label: "Russian" },
    { value: "chi_sim",     label: "Chinese (Simplified)" },
    { value: "chi_tra",     label: "Chinese (Traditional)" },
    { value: "jpn",         label: "Japanese" },
    { value: "kor",         label: "Korean" },
    { value: "ara",         label: "Arabic" },
    { value: "hin",         label: "Hindi" },
    { value: "eng+fra",     label: "English + French" },
    { value: "eng+deu",     label: "English + German" },
    { value: "eng+spa",     label: "English + Spanish" },
];

type Status = "idle" | "processing" | "success" | "already_text" | "error";

export default function OcrPdfConvertPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [result, setResult] = useState<OcrResult | null>(null);
    const [language, setLanguage] = useState("eng");
    const [force, setForce] = useState(false);
    const { execute, limitResult, clearLimitResult } = useRateLimitedAction();

    // Load file from FileStore
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const f = FileStore.getFile("ocr_pdf_main");
        if (!f) {
            router.replace("/ocr-pdf");
            return;
        }
        FileStore.clearFile("ocr_pdf_main");
        setFile(f);

        // Get page count
        import("pdfjs-dist").then((pdfjsLib) => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();
            f.arrayBuffer().then((buf) => {
                pdfjsLib.getDocument({ data: buf }).promise.then((pdfDoc) => {
                    setPageCount(pdfDoc.numPages);
                }).catch(() => {});
            });
        });
    }, [router]);

    const handleRun = () => execute(async () => {
        if (!file) return;
        setStatus("processing");
        const toastId = toast.loading("Running OCR — this may take a moment…");

        try {
            const res = await ocrPdf(file, language, force);
            setResult(res);

            if (res.alreadyHadText && !force) {
                setStatus("already_text");
                toast.success("PDF already has selectable text!", { id: toastId });
            } else {
                setStatus("success");
                toast.success("OCR complete — text is now selectable!", { id: toastId });
            }
        } finally {
            setStatus("idle"); // or whatever appropriate
        }
    });

    const handleDownload = () => {
        if (!result) return;
        downloadBlob(result.blob, result.filename);
    };

    const handleReset = () => {
        setResult(null);
        setStatus("idle");
        router.push("/ocr-pdf");
    };

    const handleForceRun = () => execute(async () => {
        setForce(true);
        // Need to wait for state update, so call directly with force=true
        if (!file) return;
        setStatus("processing");
        const toastId = toast.loading("Re-running OCR (forced)…");
        try {
            const res = await ocrPdf(file, language, true);
            setResult(res);
            setStatus("success");
            toast.success("OCR complete!", { id: toastId });
        } finally {
            // handle finally if needed
        }
    });

    const ACCENT = "#d97706";
    const ACCENT_BG = "#fff8ed";
    const ACCENT_HOVER = "#b45309";

    if (!file) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin" style={{ color: ACCENT }} />
                        <p className="text-brand-sage text-sm font-medium">Loading document…</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--brand-white)" }}>
            <RateLimitModal
                open={!!limitResult && !limitResult.allowed}
                resetAt={limitResult?.resetAt ?? 0}
                onClose={clearLimitResult}
            />
            <Navbar />

            {/* Dot grid background */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: `radial-gradient(circle, ${ACCENT} 1px, transparent 1px)`,
                    backgroundSize: "32px 32px",
                    opacity: 0.04,
                }}
            />

            <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 w-full py-12 relative z-10 flex flex-col items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center text-center gap-6 w-full max-w-lg"
                >

                    {/* ── SUCCESS STATE ─────────────────────────────────────── */}
                    {(status === "success" || status === "already_text") && result ? (
                        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-border w-full flex flex-col items-center gap-6">
                            {/* Icon */}
                            <span
                                className="flex items-center justify-center w-20 h-20 rounded-full"
                                style={{ background: ACCENT_BG, color: ACCENT }}
                            >
                                {status === "already_text"
                                    ? <IconInfoCircle size={40} stroke={2} />
                                    : <IconCheck size={40} stroke={2.5} />
                                }
                            </span>

                            <div>
                                <h1 className="text-2xl font-bold text-brand-dark">
                                    {status === "already_text" ? "PDF Already Has Text!" : "OCR Complete!"}
                                </h1>
                                <p className="text-brand-sage mt-2 text-sm leading-relaxed">
                                    {status === "already_text"
                                        ? "This PDF already contains selectable text layers. We've returned it unchanged. You can force re-OCR if the existing text is garbled."
                                        : "The scanned text has been recognised and embedded as a searchable, selectable layer — without altering the visual appearance."
                                    }
                                </p>
                            </div>

                            {/* File info */}
                            <div className="w-full flex items-start gap-3 text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                <IconFileTypePdf size={24} className="text-brand-sage shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate text-brand-dark">{result.filename}</p>
                                    <p className="text-xs text-brand-sage mt-0.5">Ready to download</p>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 w-full mt-1">
                                {status === "already_text" && (
                                    <button
                                        onClick={handleForceRun}
                                        className="flex-1 py-3.5 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98] text-sm flex items-center justify-center gap-2"
                                    >
                                        <IconRefresh size={16} />
                                        Force Re-OCR
                                    </button>
                                )}
                                <button
                                    onClick={handleReset}
                                    className="flex-1 py-3.5 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98] text-sm"
                                >
                                    New File
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 py-3.5 rounded-xl text-white font-bold transition-all cursor-pointer shadow-md active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                                    style={{ background: ACCENT }}
                                    onMouseEnter={e => (e.currentTarget.style.background = ACCENT_HOVER)}
                                    onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
                                >
                                    <IconDownload size={18} />
                                    Download PDF
                                </button>
                            </div>
                        </div>

                    ) : (
                        /* ── IDLE / PROCESSING / ERROR STATE ─────────────── */
                        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-border w-full flex flex-col items-center gap-6">
                            {/* Icon */}
                            <span
                                className="flex items-center justify-center w-20 h-20 rounded-full"
                                style={{ background: ACCENT_BG }}
                            >
                                {status === "processing" ? (
                                    <IconLoader2 size={40} className="animate-spin" style={{ color: ACCENT }} />
                                ) : status === "error" ? (
                                    <IconAlertTriangle size={40} className="text-red-500" />
                                ) : (
                                    <IconScan size={40} stroke={1.5} style={{ color: ACCENT }} />
                                )}
                            </span>

                            {/* Title & description */}
                            <div>
                                <h1 className="text-2xl font-bold text-brand-dark">
                                    {status === "processing"
                                        ? "Running OCR…"
                                        : status === "error"
                                            ? "OCR Failed"
                                            : "Make PDF Searchable"}
                                </h1>
                                <p className="text-brand-sage mt-2 text-sm leading-relaxed">
                                    {status === "processing"
                                        ? "Analysing each page and embedding a hidden text layer. This can take 5–30 seconds per page."
                                        : status === "error"
                                            ? "Something went wrong. Please try again or check the file."
                                            : "Convert non-selectable PDF files into selectable and searchable PDF with high accuracy."}
                                </p>
                            </div>

                            {/* File info card */}
                            <div className="w-full flex flex-col gap-2 text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                <p className="text-xs font-bold uppercase tracking-widest text-brand-sage mb-1">
                                    Source File
                                </p>
                                <div className="flex gap-3 items-center w-full">
                                    <IconFileTypePdf size={24} className="shrink-0" style={{ color: ACCENT }} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate text-brand-dark">{file.name}</p>
                                        <p className="text-xs text-brand-sage mt-0.5">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                            {pageCount !== null && ` · ${pageCount} page${pageCount === 1 ? "" : "s"}`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Language picker */}
                            <div className="w-full text-left">
                                <label
                                    htmlFor="ocr-language"
                                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-sage mb-2"
                                >
                                    <IconLanguage size={14} />
                                    Document Language
                                </label>
                                <select
                                    id="ocr-language"
                                    value={language}
                                    onChange={e => setLanguage(e.target.value)}
                                    disabled={status === "processing"}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-brand-dark focus:outline-none focus:ring-2 cursor-pointer disabled:opacity-50 transition-all"
                                    style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                                >
                                    {LANGUAGES.map(l => (
                                        <option key={l.value} value={l.value}>{l.label}</option>
                                    ))}
                                </select>
                                <p className="mt-1.5 text-xs text-brand-sage">
                                    Choosing the correct language significantly improves accuracy.
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 w-full mt-1">
                                <button
                                    onClick={() => router.push("/ocr-pdf")}
                                    disabled={status === "processing"}
                                    className="flex-1 py-3.5 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98] text-sm disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRun}
                                    disabled={status === "processing"}
                                    className="flex-1 py-3.5 rounded-xl text-white font-bold transition-all cursor-pointer shadow-md active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                                    style={{ background: ACCENT }}
                                    onMouseEnter={e => {
                                        if (status !== "processing") e.currentTarget.style.background = ACCENT_HOVER;
                                    }}
                                    onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
                                >
                                    {status === "processing" ? (
                                        <>
                                            <IconLoader2 size={17} className="animate-spin" />
                                            Processing…
                                        </>
                                    ) : status === "error" ? (
                                        <>
                                            <IconRefresh size={17} />
                                            Try Again
                                        </>
                                    ) : (
                                        <>
                                            <IconScan size={17} />
                                            Run OCR
                                        </>
                                    )}
                                </button>
                            </div>

                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
