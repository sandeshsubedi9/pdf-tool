"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion } from "motion/react";
import {
    IconLayersSubtract,
    IconArrowLeft,
    IconLoader2,
    IconCheck,
    IconDownload,
    IconFileTypePdf,
    IconArrowRight,
    IconAlertTriangle,
} from "@tabler/icons-react";
import { compressPdf, CompressQuality, downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
import toast from "react-hot-toast";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function percentReduction(original: number, compressed: number): number {
    if (original === 0) return 0;
    return Math.round((1 - compressed / original) * 100);
}

// ─── Compression Presets ──────────────────────────────────────────────────────

interface Preset {
    key: CompressQuality;
    label: string;
    sublabel: string;
    badge?: string;
    color: string;
    bgColor: string;
    badgeBg: string;
}

const PRESETS: Preset[] = [
    {
        key: "high",
        label: "High Compression",
        sublabel: "Smaller file · Lower quality",
        color: "#DC2626",
        bgColor: "#FEF2F2",
        badgeBg: "#DC2626",
    },
    {
        key: "medium",
        label: "Medium Compression",
        sublabel: "Good quality · Good compression",
        badge: "Recommended",
        color: "#7C3AED",
        bgColor: "#F5F3FF",
        badgeBg: "#7C3AED",
    },
    {
        key: "low",
        label: "Low Compression",
        sublabel: "High quality · Less compression",
        color: "#059669",
        bgColor: "#ECFDF5",
        badgeBg: "#059669",
    },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompressPdfConvertPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [selectedQuality, setSelectedQuality] = useState<CompressQuality>("medium");
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const [isCompressing, setIsCompressing] = useState(false);
    const [result, setResult] = useState<{
        blob: Blob;
        originalSize: number;
        compressedSize: number;
        filename: string;
    } | null>(null);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const f = FileStore.getFile("compress_pdf_main");
        if (!f) {
            router.replace("/compress-pdf");
            return;
        }
        FileStore.clearFile("compress_pdf_main");
        setFile(f);

        // Get page count via PDF.js
        import("pdfjs-dist").then((pdfjsLib) => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();
            f.arrayBuffer().then((buf) => {
                pdfjsLib.getDocument({ data: buf }).promise.then((pdfDoc) => {
                    setPageCount(pdfDoc.numPages);
                    setIsLoadingPreview(false);
                });
            });
        });
    }, [router]);

    const handleCompress = async () => {
        if (!file) return;
        setIsCompressing(true);
        const toastId = toast.loading("Compressing your PDF…");

        try {
            const res = await compressPdf(file, selectedQuality);
            setResult(res);
            toast.success("Compression complete!", { id: toastId });
        } catch (err: any) {
            const isDev = process.env.NODE_ENV === "development";
            const raw = err?.message || "Unknown error";

            if (raw.includes("not running") || raw.includes("fetch") || raw.includes("503")) {
                toast.error(
                    isDev
                        ? `Python service offline: ${raw}`
                        : "Compression service is unavailable. Please try again later.",
                    { id: toastId, duration: 6000 }
                );
            } else {
                toast.error(isDev ? `Error: ${raw}` : "Compression failed. Please try again.", {
                    id: toastId,
                });
            }
        } finally {
            setIsCompressing(false);
        }
    };

    const handleDownload = () => {
        if (!result) return;
        downloadBlob(result.blob, result.filename);
    };

    const handleReset = () => {
        setResult(null);
        router.push("/compress-pdf");
    };

    const selectedPreset = PRESETS.find((p) => p.key === selectedQuality)!;

    // ── Loading state ──
    if (!file) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#7C3AED]" />
                        <p className="text-brand-sage text-sm font-medium">Loading document…</p>
                    </div>
                </main>
            </div>
        );
    }

    // ── Success / result state ──
    if (result) {
        const reduction = percentReduction(result.originalSize, result.compressedSize);
        const isLarger = result.compressedSize > result.originalSize;

        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center py-24 px-5">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center text-center gap-6 w-full max-w-md"
                    >
                        <span className="flex items-center justify-center w-20 h-20 rounded-full bg-violet-100 text-[#7C3AED]">
                            <IconCheck size={40} stroke={2.5} />
                        </span>

                        <div>
                            <h1 className="text-2xl font-bold text-brand-dark">Compression Complete!</h1>
                            <p className="text-brand-sage mt-1 text-sm">Your PDF has been compressed and is ready to download.</p>
                        </div>

                        {/* Size stats */}
                        <div className="w-full bg-white rounded-2xl border border-border shadow-sm p-5 grid grid-cols-3 gap-3 divide-x divide-slate-100">
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-sage">Original</p>
                                <p className="text-base font-bold text-brand-dark">{formatBytes(result.originalSize)}</p>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-sage">Compressed</p>
                                <p className="text-base font-bold text-brand-dark">{formatBytes(result.compressedSize)}</p>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-sage">Saved</p>
                                <p className="text-base font-bold" style={{ color: isLarger ? "#DC2626" : "#059669" }}>
                                    {isLarger ? `+${Math.abs(reduction)}%` : reduction > 0 ? `${reduction}%` : "~0%"}
                                </p>
                            </div>
                        </div>

                        {isLarger && (
                            <div className="w-full flex items-start gap-2 text-left p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium">
                                <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
                                This PDF was already highly compressed. The output is slightly larger as your original file is already near-optimal.
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <button
                                onClick={handleReset}
                                className="flex-1 py-3.5 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98] text-sm"
                            >
                                Compress another file
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex-1 py-3.5 rounded-xl bg-[#7C3AED] text-white font-bold hover:bg-[#6D28D9] transition-all cursor-pointer shadow-md shadow-violet-200 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                            >
                                <IconDownload size={18} />
                                Download PDF
                            </button>
                        </div>
                    </motion.div>
                </main>
            </div>
        );
    }

    // ── Main editor layout ──
    return (
        <div className="min-h-screen flex flex-col relative" style={{ background: "var(--brand-white)" }}>
            <Navbar />

            {/* Dot grid */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #7C3AED 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.04,
                }}
            />

            <main className="flex-1 flex items-start justify-center px-4 pt-28 pb-12 relative z-10">
                <div className="w-full max-w-lg flex flex-col gap-4">

                    {/* Back + title */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/compress-pdf")}
                            className="flex items-center justify-center w-9 h-9 rounded-xl text-brand-sage hover:text-brand-dark hover:bg-white/80 transition-colors cursor-pointer border border-border shadow-sm"
                        >
                            <IconArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-brand-dark leading-tight">Compress PDF</h1>
                            <p className="text-xs text-brand-sage">Choose a compression level and download</p>
                        </div>
                    </div>

                    {/* File info card */}
                    <div className="bg-white border border-border rounded-2xl shadow-sm p-4 flex items-center gap-3">
                        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-100 text-[#7C3AED] shrink-0">
                            <IconFileTypePdf size={22} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-brand-dark truncate">{file.name}</p>
                            <p className="text-xs text-brand-sage">
                                {formatBytes(file.size)}
                                {pageCount !== null
                                    ? ` · ${pageCount} page${pageCount !== 1 ? "s" : ""}`
                                    : isLoadingPreview ? " · reading…" : ""}
                            </p>
                        </div>
                    </div>

                    {/* Compression level heading */}
                    <div className="px-1">
                        <h2 className="text-sm font-bold text-brand-dark">Choose Compression Level</h2>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-col gap-2.5">
                        {PRESETS.map((preset) => {
                            const active = selectedQuality === preset.key;
                            return (
                                <motion.button
                                    key={preset.key}
                                    id={`compress-level-${preset.key}`}
                                    onClick={() => setSelectedQuality(preset.key)}
                                    whileTap={{ scale: 0.98 }}
                                    className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 cursor-pointer shadow-sm ${active
                                        ? "shadow-md"
                                        : "border-border bg-white hover:border-slate-300 hover:shadow-md"
                                        }`}
                                    style={active ? { borderColor: preset.color, background: preset.bgColor } : {}}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all"
                                                style={
                                                    active
                                                        ? { borderColor: preset.color, background: preset.color }
                                                        : { borderColor: "#CBD5E1", background: "white" }
                                                }
                                            >
                                                {active && <span className="w-2 h-2 rounded-full bg-white block" />}
                                            </span>
                                            <span className="font-bold text-sm" style={{ color: active ? preset.color : "#1e1703" }}>
                                                {preset.label}
                                            </span>
                                        </div>
                                        {preset.badge && (
                                            <span
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                                                style={{ background: preset.badgeBg }}
                                            >
                                                {preset.badge}
                                            </span>
                                        )}
                                    </div>
                                    <p
                                        className="text-[11px] font-semibold pl-7"
                                        style={{ color: active ? preset.color : "#8C886B", opacity: active ? 1 : 0.8 }}
                                    >
                                        {preset.sublabel}
                                    </p>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Compress button */}
                    <button
                        id="compress-pdf-btn"
                        onClick={handleCompress}
                        disabled={isCompressing}
                        className={`w-full py-4 rounded-xl font-bold text-white text-[15px] flex items-center justify-center gap-2.5 transition-all duration-200 shadow-lg active:scale-[0.98] ${isCompressing ? "opacity-60 cursor-wait" : "cursor-pointer hover:opacity-90"}`}
                        style={{
                            background: `linear-gradient(135deg, ${selectedPreset.color}, ${selectedPreset.color}cc)`,
                            boxShadow: `0 8px 24px ${selectedPreset.color}30`,
                        }}
                    >
                        {isCompressing ? (
                            <>
                                <IconLoader2 size={20} className="animate-spin" />
                                Compressing…
                            </>
                        ) : (
                            <>
                                <IconLayersSubtract size={20} />
                                Compress PDF
                                <IconArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </main>
        </div>
    );
}
