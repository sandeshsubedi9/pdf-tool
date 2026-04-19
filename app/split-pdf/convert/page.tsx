"use client";
import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconScissors,
    IconPlus,
    IconX,
    IconLoader2,
    IconCheck,
    IconArrowLeft,
    IconFileTypePdf,
} from "@tabler/icons-react";
import { downloadBlob, downloadZip, pdfToImages, splitPdf, PdfRange } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function stringifyPages(nums: number[]) {
    return nums.sort((a, b) => a - b).join(", ");
}

function parseToRanges(input: string, maxPages: number): PdfRange[] {
    const ranges: PdfRange[] = [];
    const parts = input.split(",");
    for (let raw of parts) {
        const part = raw.trim();
        if (!part) continue;
        if (part.includes("-")) {
            const segments = part.split("-");
            if (segments.length !== 2) continue;
            let [s, e] = segments.map(x => parseInt(x.trim(), 10));
            if (!isNaN(s) && !isNaN(e)) {
                if (s > e) { const t = s; s = e; e = t; }
                const finalS = Math.max(1, Math.min(maxPages, s));
                const finalE = Math.max(1, Math.min(maxPages, e));
                ranges.push({ start: finalS, end: finalE });
            }
        } else {
            const p = parseInt(part, 10);
            if (!isNaN(p)) {
                const finalP = Math.max(1, Math.min(maxPages, p));
                ranges.push({ start: finalP, end: finalP });
            }
        }
    }
    return ranges;
}

function parsePages(input: string, maxPages: number) {
    const set = new Set<number>();
    const parts = input.split(",");
    for (let part of parts) {
        part = part.trim();
        if (!part) continue;
        if (part.includes("-")) {
            const [s, e] = part.split("-");
            let start = parseInt(s, 10);
            let end = parseInt(e, 10);
            if (!isNaN(start) && !isNaN(end)) {
                if (start > end) { const t = start; start = end; end = t; }
                for (let i = start; i <= end; i++) {
                    if (i > 0 && i <= maxPages) set.add(i);
                }
            }
        } else {
            const p = parseInt(part, 10);
            if (!isNaN(p) && p > 0 && p <= maxPages) set.add(p);
        }
    }
    return set;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SplitPdfConvertContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const modeParam = searchParams.get("mode");
    const hasInitialized = useRef(false);

    // File setup state
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<{ dataUrl: string; pageNum: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { execute, limitResult, clearLimitResult } = useRateLimitedAction();

    // Options UI Top Level
    const [topMode, setTopMode] = useState<"split" | "extract">(modeParam === "extract" ? "extract" : "split");

    // "Split" Options
    const [splitMode, setSplitMode] = useState<"custom" | "fixed">("custom");
    const [customRanges, setCustomRanges] = useState<{ id: string; startRaw: string; endRaw: string }[]>([
        { id: uid(), startRaw: "", endRaw: "" }
    ]);
    const [fixedSizeRaw, setFixedSizeRaw] = useState<string>("");
    const [mergeRanges, setMergeRanges] = useState(false);

    // "Extract" Options
    const [extractInput, setExtractInput] = useState<string>("");
    const [mergeExtracted, setMergeExtracted] = useState(false);

    // Load File & Render pages
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const f = FileStore.getFile("split_pdf_main");
        if (!f) {
            router.replace("/split-pdf");
            return;
        }

        FileStore.clearFile("split_pdf_main");
        setFile(f);

        // Load preview images
        pdfToImages(f, "image/jpeg", 1)
            .then((renderedPages) => {
                setPages(renderedPages);
                // Setup default single custom range to span first page, or user can edit
                if (renderedPages.length > 0) {
                    setCustomRanges([{ id: uid(), startRaw: "", endRaw: "" }]);
                }
            })
            .catch((err) => {
                console.error("Failed to render PDF preview:", err);
                setError("Failed to load PDF preview. Some pages could be corrupted.");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [router]);

    const totalPages = pages.length;

    // Derived Extract Select State
    const selectedPagesSet = useMemo(() => {
        return parsePages(extractInput, totalPages);
    }, [extractInput, totalPages]);

    const extractRanges = useMemo(() => {
        return parseToRanges(extractInput, totalPages);
    }, [extractInput, totalPages]);

    // Validate extractInput: must only contain digits, commas, hyphens, spaces;
    // each token must be a valid page number or range within 1..totalPages
    const extractError = useMemo(() => {
        if (!extractInput.trim()) return null;
        // Check for invalid characters
        if (/[^0-9,\- ]/.test(extractInput)) return "Only numbers, commas and hyphens are allowed (e.g. 1, 3, 5-8)";
        const parts = extractInput.split(",");
        for (let raw of parts) {
            const part = raw.trim();
            if (!part) continue;
            if (part.includes("-")) {
                const segments = part.split("-");
                if (segments.length !== 2) return `Invalid range: "${part}"`;
                const [s, e] = segments.map(x => parseInt(x.trim(), 10));
                if (isNaN(s) || isNaN(e)) return `Invalid range: "${part}"`;
                if (s < 1 || s > totalPages) return `Page ${s} is out of range (1–${totalPages})`;
                if (e < 1 || e > totalPages) return `Page ${e} is out of range (1–${totalPages})`;
                if (s > e) return `Range "${part}" is reversed — use ${e}-${s}`;
            } else {
                const p = parseInt(part, 10);
                if (isNaN(p)) return `"${part}" is not a valid page number`;
                if (p < 1 || p > totalPages) return `Page ${p} is out of range (1–${totalPages})`;
            }
        }
        return null;
    }, [extractInput, totalPages]);

    const handleGridPageClick = (pageNum: number) => {
        // In split-by-range mode: page clicks do nothing (avoids accidental range resets)
        if (topMode === "split") return;

        if (topMode === "extract") {
            const newSet = new Set(selectedPagesSet);
            if (newSet.has(pageNum)) {
                newSet.delete(pageNum);
            } else {
                newSet.add(pageNum);
            }
            const sorted = Array.from(newSet).sort((a, b) => a - b);
            setExtractInput(stringifyPages(sorted));
        }
    };

    const addRange = () => {
        setCustomRanges([...customRanges, { id: uid(), startRaw: "", endRaw: "" }]);
    };

    const deleteRange = (id: string) => {
        setCustomRanges(customRanges.filter((r) => r.id !== id));
    };

    const updateRange = (id: string, field: "startRaw" | "endRaw", val: string) => {
        // Only accept digit characters (or empty string to allow clearing)
        const cleaned = val.replace(/[^0-9]/g, "");
        setCustomRanges(
            customRanges.map((r) =>
                r.id !== id ? r : { ...r, [field]: cleaned }
            )
        );
    };

    // Derived validity for each range — used for red highlight & button state
    const rangeValidity = customRanges.map((r) => {
        const s = parseInt(r.startRaw, 10);
        const e = parseInt(r.endRaw, 10);
        const startOk = !isNaN(s) && s >= 1 && s <= totalPages;
        const endOk = !isNaN(e) && e >= 1 && e <= totalPages;
        const orderOk = startOk && endOk && s <= e;
        return { startOk, endOk, orderOk, valid: startOk && endOk && orderOk, s, e };
    });

    const allRangesValid = rangeValidity.every((rv) => rv.valid);

    // Fixed mode: parse fixedSizeRaw and derive groups for the preview
    const fixedSizeParsed = parseInt(fixedSizeRaw, 10);
    const fixedSizeValid = !isNaN(fixedSizeParsed) && fixedSizeParsed >= 1 && fixedSizeParsed <= totalPages;
    const fixedGroups: { start: number; end: number }[] = fixedSizeValid
        ? (() => {
            const groups = [];
            let s = 1;
            while (s <= totalPages) {
                groups.push({ start: s, end: Math.min(totalPages, s + fixedSizeParsed - 1) });
                s += fixedSizeParsed;
            }
            return groups;
        })()
        : [];

    const handleTransform = () => execute(async () => {
        if (!file) return;

        let rangesToProcess: PdfRange[] = [];
        let shouldMergeAll = false;

        if (topMode === "split") {
            if (splitMode === "custom") {
                if (!allRangesValid) {
                    setError("One or more ranges are invalid. Please fix them before splitting.");
                    return;
                }
                rangesToProcess = rangeValidity.map(rv => ({ start: rv.s, end: rv.e }));
                shouldMergeAll = mergeRanges;
            } else {
                // Fixed sizes
                if (!fixedSizeValid) {
                    setError("Please enter a valid page size for fixed split.");
                    return;
                }
                rangesToProcess = fixedGroups;
                shouldMergeAll = false;
            }
        } else {
            // Extract — Use preserved ranges from input parts
            rangesToProcess = extractRanges;
            if (rangesToProcess.length === 0) {
                setError("Please select at least 1 page to extract.");
                return;
            }
            shouldMergeAll = mergeExtracted;
        }

        if (rangesToProcess.length === 0) {
            setError("No valid ranges defined.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const output = await splitPdf(file, rangesToProcess, shouldMergeAll);
            const baseName = file.name.replace(/\.[^/.]+$/, "");

            if (shouldMergeAll || rangesToProcess.length === 1) {
                // Single PDF blob
                const pdfBytes = Array.isArray(output) ? output[0] : output;
                const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
                downloadBlob(blob, topMode === "extract" ? `${baseName}-extracted.pdf` : `${baseName}-split.pdf`);
            } else {
                // Return ZIP of PDFs
                const itemsToZip = (output as Uint8Array[]).map((bytes, i) => {
                    const r = rangesToProcess[i];
                    return {
                        name: `${baseName}-${r.start === r.end ? r.start : `${r.start}-${r.end}`}.pdf`,
                        data: new Blob([bytes as any], { type: "application/pdf" })
                    };
                });
                await downloadZip(itemsToZip, `${baseName}-split.zip`);
            }
            setSuccess(true);
        } catch (err: any) {
            console.error("Split/Extract error:", err);
            setError(err?.message || "Failed to split PDF. Check sizes and try again.");
        } finally {
            setIsProcessing(false);
        }
    });

    // Evaluate if a page is selected in extract mode
    const isPageHighlighted = (pageNum: number) => {
        if (topMode === "extract") return selectedPagesSet.has(pageNum);
        if (topMode === "split") {
            if (splitMode === "custom") {
                return rangeValidity.some(rv => rv.valid && pageNum >= rv.s && pageNum <= rv.e);
            } else {
                // In fixed mode, everything is conceptually chosen for a split. 
                return true;
            }
        }
        return false;
    };


    // ── Loading screen ──
    if (isLoading || !file || pages.length === 0) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#F97316]" />
                        <p className="text-brand-sage text-sm font-medium">Reading PDF pages…</p>
                    </div>
                </main>
            </div>
        );
    }

    // ── Success screen ──
    if (success) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center py-24">
                    <div className="flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in duration-300">
                        <span className="flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 text-[#F97316]">
                            <IconCheck size={40} stroke={2} />
                        </span>
                        <h1 className="text-2xl font-bold text-brand-dark">PDF Processed!</h1>
                        <p className="text-brand-sage max-w-sm">Your document has been successfully split and downloaded.</p>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => { setSuccess(false); router.push("/split-pdf"); }}
                                className="px-6 py-3 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                            >
                                Start over
                            </button>
                            <button
                                onClick={() => setSuccess(false)}
                                className="px-6 py-3 rounded-xl bg-[#F97316] text-white font-semibold hover:bg-[#ea580c] transition-all cursor-pointer shadow-md"
                            >
                                Back to editing
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--brand-white)" }}>
            <RateLimitModal
                open={!!limitResult && !limitResult.allowed}
                limit={limitResult?.limit} resetAt={limitResult?.resetAt ?? 0}
                onClose={clearLimitResult}
            />
            <Navbar />

            {/* Dot background */}
            <div aria-hidden className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #F97316 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.05,
                }}
            />

            <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 w-full pt-24 pb-6 relative z-10 flex flex-col lg:flex-row gap-6 min-h-0">

                {/* ── Header details (Visible small mostly, but part of structural flow) ── */}
                <div className="w-full lg:hidden flex items-center gap-2 mb-2 shrink-0">
                    <button
                        onClick={() => router.push("/split-pdf")}
                        aria-label="Back"
                        className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-brand-sage hover:text-brand-dark hover:bg-slate-100 transition-colors cursor-pointer active:scale-[0.97]"
                    >
                        <IconArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg text-white shrink-0 bg-[#F97316]">
                            <IconScissors size={16} stroke={1.5} />
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold text-brand-dark leading-tight truncate">Split PDF</h1>
                            <p className="text-[10px] text-brand-sage leading-tight truncate">{file.name} ({totalPages} pages)</p>
                        </div>
                    </div>
                </div>

                {/* ── Left Grid / Range Preview Area ── */}
                {/* Fixed mode: show range-group visual preview */}
                {topMode === "split" && splitMode === "fixed" ? (
                    <div className="flex-1 min-w-0 bg-white border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden">
                        <div className="hidden lg:flex items-center gap-4 px-5 py-4 border-b border-slate-100 bg-white z-10 shrink-0">
                            <button onClick={() => router.push("/split-pdf")} className="flex items-center justify-center w-10 h-10 rounded-xl text-brand-sage hover:text-brand-dark hover:bg-slate-100 transition-colors cursor-pointer">
                                <IconArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-brand-dark">Split PDF</h1>
                                <p className="text-xs text-brand-sage">{file.name} • {totalPages} pages</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">

                            {!fixedSizeValid ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                        <IconScissors size={28} className="text-slate-300" />
                                    </div>
                                    <p className="text-brand-sage text-sm font-medium">Enter a page size on the right<br />to preview how the PDF will be split</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-6">
                                    {fixedGroups.map((grp, gi) => {
                                        const firstPage = pages.find(p => p.pageNum === grp.start);
                                        const lastPage = grp.end !== grp.start ? pages.find(p => p.pageNum === grp.end) : null;
                                        const hasMiddle = grp.end - grp.start > 1;
                                        return (
                                            <motion.div
                                                key={gi}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.25, delay: gi * 0.05 }}
                                                className="flex flex-col gap-2"
                                            >
                                                <span className="text-xs font-bold text-brand-sage text-center">Range {gi + 1}</span>
                                                <div className="flex items-center gap-2 border-2 border-dashed border-[#F97316]/40 rounded-2xl p-3 bg-orange-50/20">
                                                    {/* First page */}
                                                    {firstPage && (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <div className="w-20 h-28 rounded-xl overflow-hidden border-2 border-[#F97316]/30 bg-white shadow-sm flex items-center justify-center p-1">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={firstPage.dataUrl} alt={`Page ${grp.start}`} className="max-w-full max-h-full object-contain" />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-[#F97316]">{grp.start}</span>
                                                        </div>
                                                    )}
                                                    {/* Ellipsis */}
                                                    {hasMiddle && (
                                                        <span className="text-slate-400 font-bold text-lg tracking-widest px-1 select-none">•••</span>
                                                    )}
                                                    {/* Last page */}
                                                    {lastPage && (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <div className="w-20 h-28 rounded-xl overflow-hidden border-2 border-[#F97316]/30 bg-white shadow-sm flex items-center justify-center p-1">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={lastPage.dataUrl} alt={`Page ${grp.end}`} className="max-w-full max-h-full object-contain" />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-[#F97316]">{grp.end}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 min-w-0 bg-white border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden">
                        <div className="hidden lg:flex items-center gap-4 px-5 py-4 border-b border-slate-100 bg-white z-10 shrink-0">
                            <button onClick={() => router.push("/split-pdf")} className="flex items-center justify-center w-10 h-10 rounded-xl text-brand-sage hover:text-brand-dark hover:bg-slate-100 transition-colors cursor-pointer">
                                <IconArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-brand-dark">Split PDF</h1>
                                <p className="text-xs text-brand-sage">{file.name} • {totalPages} pages</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5 ${topMode === "split" ? "pointer-events-none" : ""}`}>
                                {pages.map((p) => {
                                    const selected = isPageHighlighted(p.pageNum);
                                    return (
                                        <motion.div
                                            key={p.pageNum}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.2 }}
                                            onClick={() => handleGridPageClick(p.pageNum)}
                                            className={`relative flex flex-col items-center gap-2 group ${topMode === "extract" ? "cursor-pointer" : "cursor-default"
                                                }`}
                                            title={topMode === "extract" ? "Click to select" : undefined}
                                        >
                                            <div className={`relative w-full aspect-3/4 rounded-xl overflow-hidden border-2 transition-all p-2 bg-[#f9f9f9] shadow-sm flex items-center justify-center
                                                ${selected ? "border-[#F97316] shadow-md ring-2 ring-[#F97316]/20 bg-orange-50/10" : "border-slate-200 hover:border-slate-300"}`}
                                            >
                                                {topMode === "extract" && (
                                                    <div className={`absolute top-2 right-2 w-5 h-5 rounded-md border-2 flex items-center justify-center z-10 transition-colors
                                                        ${selected ? "bg-[#F97316] border-[#F97316] text-white" : "border-slate-300 bg-white/80 opacity-0 group-hover:opacity-100"}`}>
                                                        {selected && <IconCheck size={14} stroke={3} />}
                                                    </div>
                                                )}
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={p.dataUrl} alt={`Page ${p.pageNum}`} className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-sm" />
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${selected ? "bg-[#F97316] text-white" : "text-brand-sage bg-slate-100 group-hover:bg-slate-200"}`}>
                                                Page {p.pageNum}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Right Options Sidebar ── */}
                <div className="w-full lg:w-80 shrink-0 lg:overflow-y-auto custom-scrollbar lg:pr-2 lg:pb-0 pb-10">
                    <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-0">

                        {/* Top Mode Tabs */}
                        <div className="flex border-b border-border">
                            <button
                                onClick={() => setTopMode("split")}
                                className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${topMode === "split" ? "border-[#F97316] text-[#F97316] bg-orange-50/30" : "border-transparent text-brand-sage hover:text-brand-dark hover:bg-slate-50"}`}
                            >
                                Split by range
                            </button>
                            <button
                                onClick={() => setTopMode("extract")}
                                className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${topMode === "extract" ? "border-[#F97316] text-[#F97316] bg-orange-50/30" : "border-transparent text-brand-sage hover:text-brand-dark hover:bg-slate-50"}`}
                            >
                                Extract pages
                            </button>
                        </div>

                        <div className="p-5 flex flex-col gap-5">
                            {/* ── Split Logic ── */}
                            {topMode === "split" && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                                            <IconFileTypePdf size={18} className="text-[#F97316]" />
                                            Range mode:
                                        </h2>
                                    </div>

                                    <div className="flex bg-slate-100 rounded-lg p-1">
                                        <button onClick={() => setSplitMode("custom")} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${splitMode === "custom" ? "bg-white shadow-sm border border-slate-200 text-[#F97316]" : "text-brand-sage border border-transparent"}`}>Custom</button>
                                        <button onClick={() => setSplitMode("fixed")} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${splitMode === "fixed" ? "bg-white shadow-sm border border-slate-200 text-[#F97316]" : "text-brand-sage border border-transparent"}`}>Fixed</button>
                                    </div>

                                    {splitMode === "custom" ? (
                                        <div className="flex flex-col gap-3">
                                            <AnimatePresence initial={false}>
                                                {customRanges.map((range, i) => {
                                                    const validity = rangeValidity[i];
                                                    return (
                                                        <motion.div
                                                            key={range.id}
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                                            className="bg-slate-50 p-3 rounded-xl border border-slate-200"
                                                        >
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-xs font-bold text-brand-dark">Range {i + 1}</span>
                                                                {customRanges.length > 1 && (
                                                                    <button onClick={() => deleteRange(range.id)} className="text-brand-sage hover:text-red-500 transition-colors w-5 h-5 flex items-center justify-center rounded-md hover:bg-red-50">
                                                                        <IconX size={14} stroke={2.5} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {/* from page */}
                                                                <div className={`flex-1 bg-white border rounded-lg flex items-center overflow-hidden transition-colors ${!validity.startOk && range.startRaw !== "" ? "border-red-400 ring-1 ring-red-400" : "border-slate-200 focus-within:border-[#F97316] focus-within:ring-1 focus-within:ring-[#F97316]"}`}>
                                                                    <span className="text-[10px] text-brand-sage pl-2 pr-1 py-2.5 select-none shrink-0 whitespace-nowrap">from</span>
                                                                    <input
                                                                        inputMode="numeric"
                                                                        pattern="[0-9]*"
                                                                        placeholder="—"
                                                                        value={range.startRaw}
                                                                        onChange={(e) => updateRange(range.id, 'startRaw', e.target.value)}
                                                                        className={`flex-1 text-sm font-semibold outline-none py-2.5 pr-2 text-right bg-transparent min-w-0 ${!validity.startOk && range.startRaw !== "" ? "text-red-500" : "text-brand-dark"}`}
                                                                    />
                                                                    <div className="flex flex-col border-l border-slate-200 shrink-0">
                                                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); const cur = parseInt(range.startRaw || "0", 10); const next = cur + 1; if (next <= totalPages) updateRange(range.id, 'startRaw', String(next)); }} className="flex items-center justify-center w-7 h-5 hover:bg-orange-50 hover:text-[#F97316] text-slate-400 border-b border-slate-200 transition-colors active:bg-orange-100">
                                                                            <svg width="7" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                        </button>
                                                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); const cur = parseInt(range.startRaw || "2", 10); const next = cur - 1; if (next >= 1) updateRange(range.id, 'startRaw', String(next)); }} className="flex items-center justify-center w-7 h-5 hover:bg-orange-50 hover:text-[#F97316] text-slate-400 transition-colors active:bg-orange-100">
                                                                            <svg width="7" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {/* to page */}
                                                                <div className={`flex-1 bg-white border rounded-lg flex items-center overflow-hidden transition-colors ${(!validity.endOk && range.endRaw !== "") || (!validity.orderOk && range.startRaw !== "" && range.endRaw !== "") ? "border-red-400 ring-1 ring-red-400" : "border-slate-200 focus-within:border-[#F97316] focus-within:ring-1 focus-within:ring-[#F97316]"}`}>
                                                                    <span className="text-[10px] text-brand-sage pl-2 pr-1 py-2.5 select-none shrink-0">to</span>
                                                                    <input
                                                                        inputMode="numeric"
                                                                        pattern="[0-9]*"
                                                                        placeholder="—"
                                                                        value={range.endRaw}
                                                                        onChange={(e) => updateRange(range.id, 'endRaw', e.target.value)}
                                                                        className={`flex-1 text-sm font-semibold outline-none py-2.5 pr-2 text-right bg-transparent min-w-0 ${(!validity.endOk && range.endRaw !== "") || (!validity.orderOk && range.startRaw !== "" && range.endRaw !== "") ? "text-red-500" : "text-brand-dark"}`}
                                                                    />
                                                                    <div className="flex flex-col border-l border-slate-200 shrink-0">
                                                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); const cur = parseInt(range.endRaw || "0", 10); const next = cur + 1; if (next <= totalPages) updateRange(range.id, 'endRaw', String(next)); }} className="flex items-center justify-center w-7 h-5 hover:bg-orange-50 hover:text-[#F97316] text-slate-400 border-b border-slate-200 transition-colors active:bg-orange-100">
                                                                            <svg width="7" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                        </button>
                                                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); const cur = parseInt(range.endRaw || "2", 10); const next = cur - 1; if (next >= 1) updateRange(range.id, 'endRaw', String(next)); }} className="flex items-center justify-center w-7 h-5 hover:bg-orange-50 hover:text-[#F97316] text-slate-400 transition-colors active:bg-orange-100">
                                                                            <svg width="7" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* inline hint when order is wrong */}
                                                            {!validity.orderOk && validity.startOk && validity.endOk && (
                                                                <p className="text-[10px] text-red-500 mt-1.5 font-medium">"From" must be ≤ "To"</p>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                            <button
                                                onClick={addRange}
                                                className="mt-1 flex items-center justify-center w-full py-2.5 rounded-xl border border-dashed border-[#F97316] text-[#F97316] hover:bg-orange-50 transition-colors text-sm font-semibold gap-1.5"
                                            >
                                                <IconPlus size={16} stroke={2} /> Add Range
                                            </button>

                                            <div className="mt-4 px-1 flex flex-col gap-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-brand-sage font-medium">Files to be generated:</span>
                                                    <span className="text-brand-dark font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                                        {allRangesValid ? (mergeRanges ? 1 : customRanges.length) : 0} PDF file{(allRangesValid ? (mergeRanges ? 1 : customRanges.length) : 0) !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ── Fixed mode input ── */
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <p className="text-xs text-brand-sage mb-3 font-medium leading-relaxed">
                                                Split the PDF into chunks of <strong>N pages</strong> each. A preview will appear on the left.
                                            </p>
                                            <div className={`bg-white border rounded-xl flex items-center overflow-hidden transition-colors ${fixedSizeRaw !== "" && !fixedSizeValid
                                                ? "border-red-400 ring-1 ring-red-400"
                                                : "border-slate-200 focus-within:border-[#F97316] focus-within:ring-1 focus-within:ring-[#F97316]"
                                                }`}>
                                                <span className="text-[11px] text-brand-sage pl-3 pr-2 py-3 select-none shrink-0 whitespace-nowrap">pages per chunk</span>
                                                <input
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    placeholder="—"
                                                    value={fixedSizeRaw}
                                                    onChange={(e) => setFixedSizeRaw(e.target.value.replace(/[^0-9]/g, ""))}
                                                    className={`flex-1 text-base font-semibold outline-none py-3 pr-2 text-right bg-transparent min-w-0 ${fixedSizeRaw !== "" && !fixedSizeValid ? "text-red-500" : "text-brand-dark"
                                                        }`}
                                                />
                                                {/* Custom ▲▼ steppers */}
                                                <div className="flex flex-col border-l border-slate-200 shrink-0">
                                                    <button
                                                        type="button"
                                                        onMouseDown={(e) => { e.preventDefault(); const cur = parseInt(fixedSizeRaw || "0", 10); const next = cur + 1; if (next <= totalPages) setFixedSizeRaw(String(next)); }}
                                                        className="flex items-center justify-center w-8 h-5 hover:bg-orange-50 hover:text-[#F97316] text-slate-400 transition-colors border-b border-slate-200 active:bg-orange-100"
                                                        aria-label="Increase"
                                                    >
                                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onMouseDown={(e) => { e.preventDefault(); const cur = parseInt(fixedSizeRaw || "2", 10); const next = cur - 1; if (next >= 1) setFixedSizeRaw(String(next)); }}
                                                        className="flex items-center justify-center w-8 h-5 hover:bg-orange-50 hover:text-[#F97316] text-slate-400 transition-colors active:bg-orange-100"
                                                        aria-label="Decrease"
                                                    >
                                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            {fixedSizeRaw !== "" && !fixedSizeValid && (
                                                <p className="text-[10px] text-red-500 mt-1.5 font-medium">Must be between 1 and {totalPages}</p>
                                            )}
                                            <div className="mt-4 flex flex-col gap-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-brand-sage font-medium">Files to be generated:</span>
                                                    <span className="text-brand-dark font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                                        {fixedSizeValid ? fixedGroups.length : 0} PDF file{(fixedSizeValid ? fixedGroups.length : 0) !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {splitMode === "custom" && (
                                        <label className="flex items-center gap-3 mt-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                            <div
                                                className={`relative rounded-full transition-colors duration-200 border-2 ${mergeRanges ? "bg-[#F97316] border-[#F97316]" : "bg-slate-200 border-slate-200"}`}
                                                onClick={() => setMergeRanges((v) => !v)}
                                                style={{ height: "22px", width: "40px", flexShrink: 0 }}
                                            >
                                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${mergeRanges ? "translate-x-5" : "translate-x-0.5"}`} />
                                            </div>
                                            <span className="text-sm font-semibold text-brand-dark">Merge all ranges in one PDF</span>
                                        </label>
                                    )}
                                </>
                            )}

                            {/* ── Extract Logic ── */}
                            {topMode === "extract" && (
                                <>
                                    <div className="flex flex-col gap-3">
                                        <h2 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                                            <IconFileTypePdf size={18} className="text-[#F97316]" />
                                            Pages to Extract:
                                        </h2>
                                        <p className="text-[13px] text-brand-sage leading-relaxed">
                                            Select pages you want to extract by clicking them on the left, or type their page numbers below:
                                        </p>
                                        <div className={`bg-white border rounded-xl px-3 py-1 text-sm flex items-center shadow-sm transition-colors ${extractError
                                            ? "border-red-400 ring-1 ring-red-400 focus-within:border-red-400 focus-within:ring-red-400"
                                            : "border-slate-300 focus-within:border-[#F97316] focus-within:ring-1 focus-within:ring-[#F97316]"
                                            }`}>
                                            <input
                                                type="text"
                                                placeholder="e.g. 1, 3, 5-8"
                                                value={extractInput}
                                                onChange={(e) => {
                                                    // Only allow digits, commas, hyphens, spaces
                                                    const filtered = e.target.value.replace(/[^0-9,\- ]/g, "");
                                                    setExtractInput(filtered);
                                                }}
                                                className="w-full py-2.5 outline-none font-medium placeholder:text-slate-300"
                                            />
                                        </div>
                                        {extractError ? (
                                            <p className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                                                <span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
                                                {extractError}
                                            </p>
                                        ) : (
                                            <div className="mt-1 flex flex-col gap-1 px-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-brand-sage font-medium">Selected:</span>
                                                    <span className="text-brand-dark font-semibold">{selectedPagesSet.size} page{selectedPagesSet.size !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-brand-sage font-medium">Files to be generated:</span>
                                                    <span className="text-brand-dark font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                                        {(extractRanges.length > 0 && !extractError) ? (mergeExtracted ? 1 : extractRanges.length) : 0} PDF file{((extractRanges.length > 0 && !extractError) ? (mergeExtracted ? 1 : extractRanges.length) : 0) !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <label className="flex items-center gap-3 mt-4 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div
                                            className={`relative rounded-full transition-colors duration-200 border-2 ${mergeExtracted ? "bg-[#F97316] border-[#F97316]" : "bg-slate-200 border-slate-200"}`}
                                            onClick={() => setMergeExtracted((v) => !v)}
                                            style={{ height: "22px", width: "40px", flexShrink: 0 }}
                                        >
                                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${mergeExtracted ? "translate-x-5" : "translate-x-0.5"}`} />
                                        </div>
                                        <span className="text-sm font-semibold text-brand-dark">Merge extracted pages in one PDF</span>
                                    </label>
                                </>
                            )}

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 mt-1 rounded-full bg-red-500 shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Action button */}
                            <button
                                onClick={handleTransform}
                                disabled={isProcessing
                                    || (topMode === "split" && splitMode === "custom" && !allRangesValid)
                                    || (topMode === "split" && splitMode === "fixed" && !fixedSizeValid)
                                    || (topMode === "extract" && (!!extractError || selectedPagesSet.size === 0))
                                }
                                className={`w-full mt-2 py-3.5 rounded-xl font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] text-[15px] ${(topMode === "split" && splitMode === "custom" && !allRangesValid)
                                    || (topMode === "split" && splitMode === "fixed" && !fixedSizeValid)
                                    || (topMode === "extract" && (!!extractError || (extractInput.trim() !== "" && selectedPagesSet.size === 0)))
                                    ? "bg-red-400 cursor-not-allowed shadow-none"
                                    : isProcessing
                                        ? "bg-[#F97316] opacity-50 cursor-wait"
                                        : "bg-[#F97316] hover:bg-[#ea580c] cursor-pointer"
                                    }`}
                            >
                                {isProcessing && <IconLoader2 className="animate-spin" size={18} />}
                                {isProcessing
                                    ? "Processing…"
                                    : (topMode === "split" && splitMode === "custom" && !allRangesValid) || (topMode === "split" && splitMode === "fixed" && !fixedSizeValid)
                                        ? "Invalid range"
                                        : topMode === "extract" && !!extractError
                                            ? "Invalid pages"
                                            : topMode === "extract" && extractInput.trim() !== "" && selectedPagesSet.size === 0
                                                ? "Invalid selection"
                                                : topMode === "extract" && selectedPagesSet.size === 0
                                                    ? "Select pages first"
                                                    : topMode === "split" ? "Split PDF" : "Extract Pages"
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
}

export default function SplitPdfConvertPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-brand-white"></div>}>
            <SplitPdfConvertContent />
        </Suspense>
    );
}

