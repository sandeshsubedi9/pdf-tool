"use client";
import React, {
    useState,
    useRef,
    useCallback,
    useEffect,
} from "react";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";

import {
    IconUpload,
    IconLoader2,
    IconX,
    IconChevronLeft,
    IconChevronRight,
    IconArrowLeft,
    IconArrowRight,
    IconEye,
    IconEyeOff,
    IconAlertCircle,
    IconCheck,
    IconFiles,
    IconFileText,
    IconMinus,
    IconPlus,
    IconArrowsLeftRight,
} from "@tabler/icons-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BBox {
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
}

interface PageDiff {
    page_num: number;
    page_a_exists: boolean;
    page_b_exists: boolean;
    has_changes: boolean;
    deletions: BBox[];
    additions: BBox[];
}

interface DiffSummary {
    total_added_words: number;
    total_deleted_words: number;
    changed_pages: number[];
    total_pages: number;
}

interface DiffResult {
    total_pages_a: number;
    total_pages_b: number;
    pages: PageDiff[];
    summary: DiffSummary;
}

interface PageImage {
    pageNum: number;
    dataUrl: string;
}

// ─── Accent colour ────────────────────────────────────────────────────────────

const ACCENT = "#7C3AED"; // violet — distinct from the default teal

// ─── Drop-zone component ──────────────────────────────────────────────────────

function DropZone({
    id,
    label,
    sublabel,
    file,
    onFile,
    color,
}: {
    id: string;
    label: string;
    sublabel: string;
    file: File | null;
    onFile: (f: File) => void;
    color: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f && f.type === "application/pdf") onFile(f);
    };

    return (
        <div
            id={id}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
            className="relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none overflow-hidden"
            style={{
                borderColor: dragging ? color : file ? color : "#E0DED9",
                background: dragging ? `${color}08` : file ? `${color}06` : "#FAFAF9",
            }}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                }}
            />

            <div className="flex flex-col items-center justify-center gap-3 p-8 min-h-[180px]">
                {file ? (
                    <>
                        <span
                            className="flex items-center justify-center w-12 h-12 rounded-2xl"
                            style={{ background: `${color}15`, color }}
                        >
                            <IconFileText size={24} stroke={1.8} />
                        </span>
                        <div className="text-center">
                            <p
                                className="font-semibold text-sm truncate max-w-[200px]"
                                style={{ color }}
                            >
                                {file.name}
                            </p>
                            <p className="text-xs text-brand-sage mt-0.5">
                                {(file.size / 1024).toFixed(1)} KB · PDF
                            </p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                inputRef.current?.click();
                            }}
                            className="text-xs font-medium px-3 py-1 rounded-full border transition-colors"
                            style={{ borderColor: color, color }}
                        >
                            Change file
                        </button>
                    </>
                ) : (
                    <>
                        <span
                            className="flex items-center justify-center w-12 h-12 rounded-2xl"
                            style={{ background: `${color}10`, color }}
                        >
                            <IconUpload size={22} stroke={1.8} />
                        </span>
                        <div className="text-center">
                            <p className="font-bold text-sm text-brand-dark">{label}</p>
                            <p className="text-xs text-brand-sage mt-0.5">{sublabel}</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Page viewer with highlight overlays ─────────────────────────────────────

function PageViewer({
    pages,
    currentPage,
    diffPages,
    highlightType,
    showHighlights,
    scrollRef,
    onScroll,
    label,
    labelColor,
}: {
    pages: PageImage[];
    currentPage: number;
    diffPages: PageDiff[];
    highlightType: "deletions" | "additions";
    showHighlights: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onScroll: () => void;
    label: string;
    labelColor: string;
}) {
    const pageData = pages.find((p) => p.pageNum === currentPage);
    const diffData = diffPages.find((p) => p.page_num === currentPage);
    const boxes: BBox[] = showHighlights && diffData ? diffData[highlightType] : [];

    const highlightColor =
        highlightType === "deletions"
            ? "rgba(239, 68, 68, 0.35)"   // red-500 translucent
            : "rgba(34, 197, 94, 0.35)";  // green-500 translucent
    const highlightBorder =
        highlightType === "deletions"
            ? "rgba(239, 68, 68, 0.7)"
            : "rgba(34, 197, 94, 0.7)";

    return (
        <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0"
                style={{ background: `${labelColor}08` }}
            >
                <span
                    className="flex items-center justify-center w-6 h-6 rounded-md text-white text-xs font-bold shrink-0"
                    style={{ background: labelColor }}
                >
                    {label === "Original" ? "A" : "B"}
                </span>
                <span className="text-sm font-semibold" style={{ color: labelColor }}>
                    {label}
                </span>
                <span className="ml-auto text-xs text-brand-sage font-medium">
                    Page {currentPage}
                </span>
                {diffData?.has_changes && (
                    <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: labelColor }}
                    >
                        Changed
                    </span>
                )}
            </div>

            {/* Scrollable content */}
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="flex-1 overflow-auto custom-scrollbar"
            >
                <div className="flex justify-center p-4">
                    {pageData ? (
                        <div className="relative inline-block shadow-lg rounded overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={pageData.dataUrl}
                                alt={`Page ${currentPage}`}
                                className="block max-w-full"
                                style={{ display: "block" }}
                                draggable={false}
                            />
                            {/* Highlight overlays */}
                            {boxes.map((box, i) => (
                                <div
                                    key={i}
                                    className="absolute pointer-events-none"
                                    style={{
                                        left: `${box.x * 100}%`,
                                        top: `${box.y * 100}%`,
                                        width: `${box.w * 100}%`,
                                        height: `${box.h * 100}%`,
                                        background: highlightColor,
                                        border: `1px solid ${highlightBorder}`,
                                        borderRadius: 2,
                                    }}
                                    title={box.text}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-20 text-brand-sage">
                            <IconFiles size={32} stroke={1.5} />
                            <p className="text-sm font-medium">No page available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComparePdfPage() {
    const [fileA, setFileA] = useState<File | null>(null);
    const [fileB, setFileB] = useState<File | null>(null);

    const [step, setStep] = useState<"upload" | "processing" | "results">("upload");
    const [processingMsg, setProcessingMsg] = useState("Analysing documents…");
    const [error, setError] = useState<string | null>(null);

    const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
    const [pagesA, setPagesA] = useState<PageImage[]>([]);
    const [pagesB, setPagesB] = useState<PageImage[]>([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [showHighlights, setShowHighlights] = useState(true);

    const scrollARef = useRef<HTMLDivElement>(null);
    const scrollBRef = useRef<HTMLDivElement>(null);
    const isSyncing = useRef(false);

    // ── Sync scroll ──────────────────────────────────────────────────────────

    const syncScroll = useCallback((source: "a" | "b") => {
        if (isSyncing.current) return;
        isSyncing.current = true;
        const src = source === "a" ? scrollARef.current : scrollBRef.current;
        const dst = source === "a" ? scrollBRef.current : scrollARef.current;
        if (src && dst) {
            dst.scrollTop = src.scrollTop;
            dst.scrollLeft = src.scrollLeft;
        }
        requestAnimationFrame(() => { isSyncing.current = false; });
    }, []);

    // ── Render pages from a File via PDF.js ──────────────────────────────────

    const renderPages = useCallback(async (file: File): Promise<PageImage[]> => {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
        ).toString();

        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const results: PageImage[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.8 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            results.push({
                pageNum: i,
                dataUrl: canvas.toDataURL("image/jpeg", 0.9),
            });
        }
        return results;
    }, []);

    // ── Run comparison ───────────────────────────────────────────────────────

    const runCompare = useCallback(async () => {
        if (!fileA || !fileB) return;

        (async () => {
            setStep("processing");
            setError(null);

            try {
                // Step 1: Fetch diff data from backend
                setProcessingMsg("Extracting & comparing text…");
                const form = new FormData();
                form.append("file_a", fileA, fileA.name);
                form.append("file_b", fileB, fileB.name);

                const diffRes = await fetch("/api/compare-pdf", {
                    method: "POST",
                    body: form,
                });

                if (!diffRes.ok) {
                    const body = await diffRes.json().catch(() => ({}));
                    throw new Error(body.error || `Server error ${diffRes.status}`);
                }

                const diff: DiffResult = await diffRes.json();
                setDiffResult(diff);

                // Step 2: Render both PDFs as images client-side
                setProcessingMsg("Rendering " + fileA.name + "…");
                const imgA = await renderPages(fileA);
                setPagesA(imgA);

                setProcessingMsg("Rendering " + fileB.name + "…");
                const imgB = await renderPages(fileB);
                setPagesB(imgB);

                setCurrentPage(1);
                setStep("results");
            } catch (err: any) {
                setError(err?.message || "An unexpected error occurred.");
                setStep("upload");
            }
        })();
    }, [fileA, fileB, renderPages, execute]);

    // ── Derived page list ────────────────────────────────────────────────────

    const pageList = diffResult ? diffResult.pages : [];

    const totalPages = pageList.length;
    const pageIndex = pageList.findIndex((p) => p.page_num === currentPage);

    const goToPage = (num: number) => {
        setCurrentPage(num);
        // Scroll both viewers back to top on page change
        scrollARef.current && (scrollARef.current.scrollTop = 0);
        scrollBRef.current && (scrollBRef.current.scrollTop = 0);
    };

    const prevPage = () => {
        if (pageIndex > 0) goToPage(pageList[pageIndex - 1].page_num);
    };
    const nextPage = () => {
        if (pageIndex < totalPages - 1) goToPage(pageList[pageIndex + 1].page_num);
    };

    const changedPageList = diffResult?.summary.changed_pages ?? [];

    // ── Reset ────────────────────────────────────────────────────────────────

    const reset = () => {
        setFileA(null);
        setFileB(null);
        setDiffResult(null);
        setPagesA([]);
        setPagesB([]);
        setStep("upload");
        setError(null);
        setShowHighlights(true);
    };

    // ════════════════════════════════════════════════════════════════════════
    // RENDER : UPLOAD STEP
    // ════════════════════════════════════════════════════════════════════════
    if (step === "upload") {
        return (
            <div
                className="min-h-screen flex flex-col relative overflow-hidden pt-16"
                style={{ background: "var(--brand-white)" }}
            >
                <Navbar />

                {/* Background accents */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage: `radial-gradient(circle, ${ACCENT} 1px, transparent 1px)`,
                        backgroundSize: "32px 32px",
                        opacity: 0.04,
                    }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute right-0 top-0 w-1/2 h-full opacity-[0.04]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 80% 40%, ${ACCENT} 0%, transparent 60%)`,
                    }}
                />

                <main className="flex-1 max-w-7xl mx-auto px-5 md:px-8 w-full py-12 md:py-0 relative z-10 flex flex-col justify-center">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">

                        {/* ── LEFT ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="flex flex-col gap-6"
                        >
                            <div className="flex items-center gap-4">
                                <span
                                    className="flex items-center justify-center w-14 h-14 rounded-2xl text-white shrink-0 shadow-sm"
                                    style={{ background: ACCENT }}
                                >
                                    <IconArrowsLeftRight size={28} stroke={1.5} />
                                </span>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wide w-fit"
                                    style={{ background: `${ACCENT}10`, borderColor: `${ACCENT}30`, color: ACCENT }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />
                                    Free Online PDF Tool
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-5xl font-bold leading-[1.15] tracking-tight text-brand-dark max-w-md">
                                Compare PDF - Find Differences Between Two Documents
                            </h1>
                            <div className="lg:max-h-[calc(100vh-14rem)] overflow-y-auto custom-scrollbar pr-4 -mr-4 pb-12 lg:pb-0">
                                <div className="flex flex-col gap-5 mt-4">
                                    <p className="text-brand-sage leading-relaxed">
                                        Spot changes instantly with SandeshPDF’s Compare PDF tool. Compare two PDF files side-by-side to highlight additions, deletions, and modifications.
                                    </p>
                                    <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
                                    <ul className="flex flex-col gap-2.5">
                                        <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                                            <span><strong>Visual Highlights:</strong> Color-coded changes show exactly what’s different.</span>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                                            <span><strong>Side-by-Side View:</strong> See original and revised versions simultaneously.</span>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                                            <span><strong>Detailed Report:</strong> Generate a summary of all changes made.</span>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                                            <span><strong>Version Control:</strong> Essential for tracking contract revisions.</span>
                                        </li>
                                    </ul>
                                    <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
                                    <ul className="flex flex-col gap-2.5">
                                        <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                                            <span>Contract Review: Verify changes made by legal teams.</span>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                                            <span>Editing Proofing: Check drafts against final versions.</span>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#7C3AED]" />
                                            <span>Audit Trails: Track modifications in financial reports.</span>
                                        </li>
                                    </ul>
                                    <p className="text-sm font-medium text-brand-dark mt-2">
                                        Never miss a change with our PDF comparison tool.
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* ── RIGHT ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                            className="flex flex-col gap-5"
                        >
                            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-5">
                                <h2 className="text-sm font-bold text-brand-dark text-center">Upload Two PDFs to Compare</h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DropZone
                                        id="drop-zone-a"
                                        label="Original PDF"
                                        sublabel="Drag & drop or click"
                                        file={fileA}
                                        onFile={setFileA}
                                        color="#ef4444"
                                    />
                                    <DropZone
                                        id="drop-zone-b"
                                        label="Modified PDF"
                                        sublabel="Drag & drop or click"
                                        file={fileB}
                                        onFile={setFileB}
                                        color="#22c55e"
                                    />
                                </div>

                                {/* Legend */}
                                <div className="flex items-center justify-center gap-6 text-xs text-brand-sage">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(239,68,68,0.4)" }} />
                                        Removed text (A only)
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(34,197,94,0.4)" }} />
                                        Added text (B only)
                                    </span>
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                                        <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    id="compare-pdf-btn"
                                    onClick={runCompare}
                                    disabled={!fileA || !fileB}
                                    className="w-full py-4 rounded-xl font-bold text-white text-[15px] flex items-center justify-center gap-2.5 transition-all duration-200 shadow-lg active:scale-[0.98]"
                                    style={{
                                        background: fileA && fileB
                                            ? `linear-gradient(135deg, ${ACCENT}, #6d28d9)`
                                            : "#D1D5DB",
                                        cursor: fileA && fileB ? "pointer" : "not-allowed",
                                        boxShadow: fileA && fileB ? `0 8px 24px ${ACCENT}30` : "none",
                                    }}
                                >
                                    <IconArrowsLeftRight size={20} />
                                    Compare PDFs
                                    <IconArrowRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </main>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // RENDER : PROCESSING STEP
    // ════════════════════════════════════════════════════════════════════════
    if (step === "processing") {
        return (
            <div
                className="min-h-screen flex flex-col pt-16"
                style={{ background: "var(--brand-white)" }}
            >
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-6 text-center px-6"
                    >
                        {/* Animated rings */}
                        <div className="relative flex items-center justify-center w-24 h-24">
                            <div
                                className="absolute inset-0 rounded-full animate-ping opacity-20"
                                style={{ background: ACCENT }}
                            />
                            <div
                                className="absolute inset-2 rounded-full animate-ping opacity-15"
                                style={{ background: ACCENT, animationDelay: "0.3s" }}
                            />
                            <span
                                className="relative flex items-center justify-center w-16 h-16 rounded-full text-white"
                                style={{ background: ACCENT }}
                            >
                                <IconLoader2 size={32} className="animate-spin" />
                            </span>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-brand-dark">Comparing Documents</h2>
                            <p className="text-brand-sage text-sm mt-1">{processingMsg}</p>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-brand-sage">
                            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-border shadow-sm">
                                <IconFileText size={14} style={{ color: "#ef4444" }} />
                                {fileA?.name}
                            </span>
                            <IconArrowsLeftRight size={16} />
                            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-border shadow-sm">
                                <IconFileText size={14} style={{ color: "#22c55e" }} />
                                {fileB?.name}
                            </span>
                        </div>
                    </motion.div>
                </main>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // RENDER : RESULTS STEP
    // ════════════════════════════════════════════════════════════════════════
    const summary = diffResult!.summary;
    const currentDiffPage = diffResult!.pages.find((p) => p.page_num === currentPage);
    const hasNoChanges = summary.changed_pages.length === 0;

    return (
        <div
            className="h-screen flex flex-col overflow-hidden pt-16"
            style={{ background: "var(--brand-white)" }}
        >
            <Navbar />

            {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-100 z-20 flex-wrap">

                {/* Back */}
                <button
                    id="compare-back-btn"
                    onClick={reset}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-sage hover:text-brand-dark transition-colors cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-100"
                >
                    <IconArrowLeft size={15} />
                    New Comparison
                </button>

                <div className="w-px h-5 bg-slate-200" />

                {/* Summary chips */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                        <IconMinus size={12} />
                        {summary.total_deleted_words} removed
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                        <IconPlus size={12} />
                        {summary.total_added_words} added
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-brand-sage">
                        <IconArrowsLeftRight size={12} />
                        {summary.changed_pages.length} pages changed
                    </span>
                </div>

                <div className="flex-1" />

                {/* Highlight toggle */}
                <button
                    id="toggle-highlights"
                    onClick={() => setShowHighlights((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer"
                    style={showHighlights
                        ? { background: ACCENT, borderColor: ACCENT, color: "white" }
                        : { background: "white", borderColor: "#E0DED9", color: "#8C886B" }
                    }
                >
                    {showHighlights ? <IconEye size={13} /> : <IconEyeOff size={13} />}
                    Highlights
                </button>

                <div className="w-px h-5 bg-slate-200" />

                {/* Page navigation */}
                <div className="flex items-center gap-1.5">
                    <button
                        id="compare-prev-page"
                        onClick={prevPage}
                        disabled={pageIndex <= 0}
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-border text-brand-sage hover:text-brand-dark hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <IconChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-semibold text-brand-dark min-w-[80px] text-center">
                        Page {currentPage} / {diffResult!.summary.total_pages}
                    </span>
                    <button
                        id="compare-next-page"
                        onClick={nextPage}
                        disabled={pageIndex >= totalPages - 1}
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-border text-brand-sage hover:text-brand-dark hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <IconChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0 overflow-hidden gap-3 p-3">

                {/* ── LEFT SIDEBAR : Changed pages list ── */}
                <div className="hidden xl:flex flex-col w-52 shrink-0 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-brand-sage">
                            Changed Pages
                        </p>
                        <p className="text-xs text-brand-sage mt-0.5">
                            {changedPageList.length} of {summary.total_pages} pages
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                        {hasNoChanges ? (
                            <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
                                <IconCheck size={24} className="text-green-500" />
                                <p className="text-xs text-brand-sage font-medium">
                                    No differences found
                                </p>
                            </div>
                        ) : (
                            diffResult!.pages.map((page) => (
                                <button
                                    key={page.page_num}
                                    onClick={() => goToPage(page.page_num)}
                                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors cursor-pointer text-xs font-medium"
                                    style={{
                                        background: currentPage === page.page_num ? `${ACCENT}10` : "transparent",
                                        color: currentPage === page.page_num ? ACCENT : page.has_changes ? "#1E1702" : "#8C886B",
                                    }}
                                >
                                    <span>Page {page.page_num}</span>
                                    {page.has_changes ? (
                                        <span className="flex items-center gap-1">
                                            {page.deletions.length > 0 && (
                                                <span className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold text-white"
                                                    style={{ background: "#ef4444" }}>
                                                    {page.deletions.length}
                                                </span>
                                            )}
                                            {page.additions.length > 0 && (
                                                <span className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold text-white"
                                                    style={{ background: "#22c55e" }}>
                                                    {page.additions.length}
                                                </span>
                                            )}
                                        </span>
                                    ) : (
                                        <IconCheck size={12} className="text-green-400" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* ── DUAL PAGE VIEWERS ── */}
                <div className="flex flex-1 min-w-0 gap-3 overflow-hidden">
                    {hasNoChanges ? (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex-1 flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-border shadow-sm"
                        >
                            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-green-50 text-green-500">
                                <IconCheck size={40} stroke={2.5} />
                            </span>
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-brand-dark">Documents are identical</h2>
                                <p className="text-brand-sage text-sm mt-1">
                                    No text differences were found between these two PDFs.
                                </p>
                            </div>
                            <button
                                onClick={reset}
                                className="mt-2 px-6 py-3 rounded-xl font-bold text-white text-sm flex items-center gap-2 cursor-pointer"
                                style={{ background: ACCENT }}
                            >
                                Compare other files
                            </button>
                        </motion.div>
                    ) : (
                        <>
                            <PageViewer
                                pages={pagesA}
                                currentPage={currentPage}
                                diffPages={diffResult!.pages}
                                highlightType="deletions"
                                showHighlights={showHighlights}
                                scrollRef={scrollARef}
                                onScroll={() => syncScroll("a")}
                                label="Original"
                                labelColor="#ef4444"
                            />
                            <PageViewer
                                pages={pagesB}
                                currentPage={currentPage}
                                diffPages={diffResult!.pages}
                                highlightType="additions"
                                showHighlights={showHighlights}
                                scrollRef={scrollBRef}
                                onScroll={() => syncScroll("b")}
                                label="Modified"
                                labelColor="#22c55e"
                            />
                        </>
                    )}
                </div>

                {/* ── RIGHT SIDEBAR : Diff detail for current page ── */}
                <div className="hidden xl:flex flex-col w-56 shrink-0 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-brand-sage">
                            Page {currentPage} Details
                        </p>
                        {currentDiffPage?.has_changes ? (
                            <span
                                className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                                style={{ background: ACCENT }}
                            >
                                Modified
                            </span>
                        ) : (
                            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                Unchanged
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar py-3 flex flex-col gap-3 px-4">
                        {/* Deletions */}
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                                style={{ color: "#ef4444" }}>
                                ✕ Removed ({currentDiffPage?.deletions.length ?? 0})
                            </p>
                            {(currentDiffPage?.deletions ?? []).slice(0, 20).map((d, i) => (
                                <div
                                    key={i}
                                    className="text-[11px] py-0.5 px-2 mb-1 rounded font-mono truncate"
                                    style={{ background: "rgba(239,68,68,0.08)", color: "#b91c1c" }}
                                    title={d.text}
                                >
                                    — {d.text}
                                </div>
                            ))}
                            {(currentDiffPage?.deletions.length ?? 0) > 20 && (
                                <p className="text-[10px] text-brand-sage mt-1">
                                    +{(currentDiffPage?.deletions.length ?? 0) - 20} more…
                                </p>
                            )}
                        </div>

                        {/* Additions */}
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                                style={{ color: "#22c55e" }}>
                                + Added ({currentDiffPage?.additions.length ?? 0})
                            </p>
                            {(currentDiffPage?.additions ?? []).slice(0, 20).map((a, i) => (
                                <div
                                    key={i}
                                    className="text-[11px] py-0.5 px-2 mb-1 rounded font-mono truncate"
                                    style={{ background: "rgba(34,197,94,0.08)", color: "#15803d" }}
                                    title={a.text}
                                >
                                    + {a.text}
                                </div>
                            ))}
                            {(currentDiffPage?.additions.length ?? 0) > 20 && (
                                <p className="text-[10px] text-brand-sage mt-1">
                                    +{(currentDiffPage?.additions.length ?? 0) - 20} more…
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


