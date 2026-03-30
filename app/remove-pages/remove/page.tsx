"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconLoader2,
    IconArrowLeft,
    IconDownload,
    IconFileMinus,
    IconCheck,
    IconX,
} from "@tabler/icons-react";
import { downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
import { useRateLimitedAction } from "@/lib/use-rate-limited-action";
import { RateLimitModal } from "@/components/RateLimitModal";

// ── Helpers ──────────────────────────────────────────────────────────────────
function parsePageRanges(input: string, maxPage: number): Set<number> {
    const pages = new Set<number>();
    const trimmed = input.trim();
    if (!trimmed) return pages;

    if (!/^[\d\s,-]*$/.test(input)) {
        throw new Error("Only numbers, commas, and hyphens are allowed.");
    }

    const parts = trimmed.split(",");
    for (const part of parts) {
        const p = part.trim();
        if (!p) continue;

        if (p.includes("-")) {
            const rangeParts = p.split("-");
            if (rangeParts.length !== 2 || !rangeParts[0].trim() || !rangeParts[1].trim()) {
                throw new Error("Invalid range format. Use e.g., '3-5'.");
            }
            const s = parseInt(rangeParts[0], 10);
            const e = parseInt(rangeParts[1], 10);
            if (isNaN(s) || isNaN(e)) {
                throw new Error(`Invalid range numbers: ${p}`);
            }
            if (s < 1 || e > maxPage || s > e) {
                throw new Error(`Range out of bounds: ${p} (max ${maxPage}).`);
            }
            for (let i = s; i <= e; i++) {
                pages.add(i);
            }
        } else {
            const num = parseInt(p, 10);
            if (isNaN(num)) {
                throw new Error(`Invalid page number: ${p}`);
            }
            if (num < 1 || num > maxPage) {
                throw new Error(`Page out of bounds: ${p} (max ${maxPage}).`);
            }
            pages.add(num);
        }
    }
    return pages;
}

function formatPageRanges(pagesSet: Set<number>): string {
    if (pagesSet.size === 0) return "";
    const sorted = Array.from(pagesSet).sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) {
            end = sorted[i];
        } else {
            if (start === end) ranges.push(`${start}`);
            else ranges.push(`${start}-${end}`);
            start = sorted[i];
            end = sorted[i];
        }
    }
    if (start === end) ranges.push(`${start}`);
    else ranges.push(`${start}-${end}`);
    return ranges.join(", ");
}

interface PageItem {
    pageIndex: number; // 1-based index
    thumbnail: string;
}

export default function RemovePagesToolPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);

    // State for removing pages
    const [removedPages, setRemovedPages] = useState<Set<number>>(new Set());
    const [inputValue, setInputValue] = useState("");
    const [inputError, setInputError] = useState<string | null>(null);

    const { execute, limitResult: rateLimitResult, clearLimitResult } = useRateLimitedAction();

    // ── Load file from FileStore ─────────────────────────────────────────────
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const f = FileStore.getFile("remove-pages_0");
        if (!f) {
            router.replace("/remove-pages");
            return;
        }

        setFile(f);
        loadThumbnails(f);
    }, [router]);

    const loadThumbnails = useCallback(async (f: File) => {
        setIsLoading(true);
        setLoadingProgress(0);
        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();
            const ab = await f.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
            const n = pdf.numPages;

            const loadedPages: PageItem[] = [];
            for (let i = 1; i <= n; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.0 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport } as any).promise;
                
                loadedPages.push({
                    pageIndex: i,
                    thumbnail: canvas.toDataURL("image/jpeg", 0.8),
                });
                setLoadingProgress(Math.round((i / n) * 100));
            }
            setPages(loadedPages);
        } catch {
            setGlobalError("Could not read PDF file.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Input changes ────────────────────────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        
        if (pages.length === 0) return;

        try {
            const parsed = parsePageRanges(val, pages.length);
            setRemovedPages(parsed);
            setInputError(null);
        } catch (err: any) {
            setInputError(err.message || "Invalid input.");
        }
    };

    const togglePage = (pageIndex: number) => {
        const newRemoved = new Set(removedPages);
        if (newRemoved.has(pageIndex)) {
            newRemoved.delete(pageIndex);
        } else {
            newRemoved.add(pageIndex);
        }
        setRemovedPages(newRemoved);
        setInputValue(formatPageRanges(newRemoved));
        setInputError(null); // Clear any syntax errors if we click
    };

    // ── Export ───────────────────────────────────────────────────────────────
    const handleExport = async () => {
        if (!file || pages.length === 0) return;
        
        if (removedPages.size === pages.length) {
            setGlobalError("You cannot remove all pages from the PDF.");
            return;
        }

        setIsProcessing(true);
        setGlobalError(null);

        execute(async () => {
            try {
                const { PDFDocument } = await import("pdf-lib");
                
                const ab = await file.arrayBuffer();
                const sourceDoc = await PDFDocument.load(ab);
                const pdfDoc = await PDFDocument.create();

                for (let i = 1; i <= pages.length; i++) {
                    if (!removedPages.has(i)) {
                        const [copiedPage] = await pdfDoc.copyPages(sourceDoc, [i - 1]);
                        pdfDoc.addPage(copiedPage);
                    }
                }

                const bytes = await pdfDoc.save();
                const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
                
                const originalName = file.name.replace(/\.[^/.]+$/, "");
                downloadBlob(blob, `${originalName}_removed.pdf`);
                
                setSuccess(true);
            } catch (err: any) {
                setGlobalError(err?.message || "Export failed. Please try again.");
            } finally {
                setIsProcessing(false);
            }
        });
    };

    // ── Render States ────────────────────────────────────────────────────────
    if (isLoading && pages.length === 0) {
        return (
            <div className="min-h-screen flex flex-col bg-[#F7F6F3]">
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#059669]" />
                        <p className="text-brand-sage text-sm font-medium">Read pages ({loadingProgress}%)...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col bg-[#F7F6F3]">
                <Navbar />
                <main className="flex-1 flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-border max-w-lg w-full text-center"
                    >
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <IconCheck size={40} className="text-emerald-500" stroke={2} />
                        </div>
                        <h2 className="text-2xl font-bold text-brand-dark mb-4">
                            Pages Removed Successfully!
                        </h2>
                        <p className="text-brand-sage mb-8">
                            Your modified PDF has been downloaded.
                        </p>
                        <button
                            onClick={() => router.push("/remove-pages")}
                            className="bg-[#059669] text-white px-8 py-3.5 rounded-full font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg w-full"
                        >
                            Remove Pages from Another PDF
                        </button>
                    </motion.div>
                </main>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#F7F6F3] pt-[64px] overflow-hidden">
            <Navbar />

            {/* Header Toolbar */}
            <div className="bg-white border-b border-border sticky top-0 z-40 px-4 md:px-6 py-3 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                        onClick={() => router.push("/remove-pages")}
                        className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full hover:bg-slate-100 transition-colors text-brand-dark shrink-0"
                        title="Back"
                    >
                        <IconArrowLeft size={20} />
                    </button>
                    <span className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-emerald-50 text-[#059669] shrink-0">
                        <IconFileMinus size={20} stroke={2} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-sm md:text-base font-bold text-brand-dark leading-tight truncate">
                            Remove PDF Pages
                        </h1>
                        <p className="text-[10px] md:text-xs text-brand-sage truncate mt-0.5">
                            {file?.name} • {pages.length} pages
                        </p>
                    </div>
                </div>
            </div>

            {globalError && (
                <div className="bg-red-50 text-red-600 p-3 flex items-center justify-center text-sm font-medium border-b border-red-100 shrink-0">
                    {globalError}
                </div>
            )}

            {/* Split View */}
            <div className="flex flex-1 overflow-hidden">
                {/* Pages Grid */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-6 pb-24">
                        <AnimatePresence>
                            {pages.map((p) => {
                                const isRemoved = removedPages.has(p.pageIndex);
                                return (
                                    <PageCard
                                        key={p.pageIndex}
                                        page={p}
                                        isRemoved={isRemoved}
                                        onToggle={() => togglePage(p.pageIndex)}
                                    />
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </main>

                {/* Right Sidebar */}
                <aside className="w-[320px] shrink-0 border-l border-border bg-white flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
                        
                        <div className="flex flex-col gap-2">
                            <h3 className="text-sm font-bold text-brand-dark">Pages to Remove</h3>
                            <p className="text-xs text-brand-sage leading-relaxed">
                                Click on pages in the preview, or type the page numbers below separated by commas or hyphens (e.g. <code className="bg-gray-100 px-1 rounded">1, 3, 5-7</code>).
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={handleInputChange}
                                placeholder="E.g. 1, 3, 5-7"
                                className={`w-full border rounded-xl py-3 px-4 text-sm font-medium bg-gray-50 text-brand-dark focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-inner border-border focus:ring-[#059669]/30 ${
                                    inputError ? "border-red-300 ring-4 ring-red-100 focus:ring-red-300" : ""
                                }`}
                            />
                            {inputError && (
                                <p className="text-xs text-red-500 font-medium px-1">
                                    {inputError}
                                </p>
                            )}
                        </div>

                        <div className="mt-auto bg-emerald-50 rounded-xl p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-brand-sage font-medium">Total Pages</span>
                                <span className="text-brand-dark font-bold">{pages.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-brand-sage font-medium">Pages to Remove</span>
                                <span className="text-red-500 font-bold">{removedPages.size}</span>
                            </div>
                            <div className="border-t border-emerald-200/50 my-1" />
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-brand-sage font-medium">Pages Remaining</span>
                                <span className="text-[#059669] font-bold">{pages.length - removedPages.size}</span>
                            </div>
                        </div>
                    </div>

                    {/* Apply Changes Button */}
                    <div className="p-4 border-t border-border bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                        <button
                            onClick={handleExport}
                            disabled={isProcessing || !!inputError}
                            className="w-full bg-[#059669] text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-[0.98]"
                        >
                            {isProcessing ? (
                                <><IconLoader2 size={18} className="animate-spin" /> Processing…</>
                            ) : (
                                <><IconDownload size={18} /> Apply Changes</>
                            )}
                        </button>
                    </div>
                </aside>
            </div>
            <RateLimitModal
                open={!!rateLimitResult}
                resetAt={rateLimitResult?.resetAt ?? 0}
                onClose={clearLimitResult}
            />
        </div>
    );
}

// ── Components ───────────────────────────────────────────────────────────────
function PageCard({
    page,
    isRemoved,
    onToggle,
}: {
    page: PageItem;
    isRemoved: boolean;
    onToggle: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onToggle}
            className="relative flex flex-col items-center gap-2 group select-none cursor-pointer"
            style={{ width: 140 }}
        >
            <div
                className={`relative w-full rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    isRemoved 
                        ? "border-red-400 opacity-60 shadow-sm" 
                        : hovered 
                            ? "border-red-400 shadow-xl" 
                            : "border-[#E0DED9] shadow-sm"
                }`}
                style={{ aspectRatio: "0.707", background: "#f3f3f3" }}
            >
                <img
                    src={page.thumbnail}
                    alt={`Page ${page.pageIndex}`}
                    draggable={false}
                    className="w-full h-full object-contain mix-blend-multiply"
                />

                {/* Red cross overlay when removed */}
                {isRemoved && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
                        <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg">
                            <IconX size={40} stroke={2.5} />
                        </div>
                    </div>
                )}
                
                {/* Hover overlay hint */}
                {!isRemoved && hovered && (
                    <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shadow-lg transition-transform hover:scale-110">
                            <IconX size={28} stroke={2.5} />
                        </div>
                    </div>
                )}
            </div>

            <div className={`text-[12px] font-bold px-3 py-1 rounded-full shadow-sm transition-colors ${
                isRemoved ? "bg-red-100 text-red-500" : "bg-[#8C886B] text-white"
            }`}>
                Page {page.pageIndex}
            </div>
        </motion.div>
    );
}
