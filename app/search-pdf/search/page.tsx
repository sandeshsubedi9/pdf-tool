"use client";

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import FileStore from "@/lib/file-store";
import {
    IconSearch,
    IconChevronUp,
    IconChevronDown,
    IconX,
    IconArrowLeft,
    IconLoader2,
    IconFileText,
    IconAlertCircle,
    IconListSearch,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextItem {
    text: string;
    page: number; // 1-indexed
    // Bounding box in viewport coordinates (px), relative to rendered canvas
    x: number;
    y: number;
    w: number;
    h: number;
}

interface SearchMatch {
    itemIndex: number; // index into flatTextItems
    charStart: number;
    charEnd: number;
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
}

interface RenderedPage {
    dataUrl: string;
    width: number;
    height: number;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchPdfSearchPage() {
    const router = useRouter();

    const [pages, setPages] = useState<RenderedPage[]>([]);
    const [textItems, setTextItems] = useState<TextItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [fileName, setFileName] = useState("");

    const [query, setQuery] = useState("");
    const [matches, setMatches] = useState<SearchMatch[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const matchRefs = useRef<(HTMLDivElement | null)[]>([]);

    // ── Load PDF ─────────────────────────────────────────────────────────────

    useEffect(() => {
        const file = FileStore.getFile("search_pdf_file");
        if (!file) {
            router.replace("/search-pdf");
            return;
        }
        setFileName(file.name);
        loadPdf(file);
        // Focus search after load
        setTimeout(() => searchInputRef.current?.focus(), 800);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadPdf = async (file: File) => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const ab = await file.arrayBuffer();
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();

            const doc = await pdfjsLib.getDocument({ data: ab }).promise;
            const SCALE = 1.5;

            const renderedPages: RenderedPage[] = [];
            const allTextItems: TextItem[] = [];

            for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
                const page = await doc.getPage(pageNum);
                const vp = page.getViewport({ scale: SCALE });

                // ── Render canvas ──────────────────────────────────────────
                const canvas = document.createElement("canvas");
                canvas.width = vp.width;
                canvas.height = vp.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
                renderedPages.push({
                    dataUrl: canvas.toDataURL("image/png"),
                    width: vp.width,
                    height: vp.height,
                });

                // ── Extract text with positions ────────────────────────────
                const textContent = await page.getTextContent();
                for (const item of textContent.items as any[]) {
                    if (!item.str || item.str.trim() === "") continue;
                    // item.transform = [a, b, c, d, tx, ty] in PDF coords
                    const tx = vp.convertToViewportPoint(
                        item.transform[4],
                        item.transform[5]
                    );
                    // width is in PDF units, scale to viewport
                    const wPx = item.width * SCALE;
                    const hPx = item.height > 0 ? item.height * SCALE : Math.abs(item.transform[0]) * SCALE;

                    allTextItems.push({
                        text: item.str,
                        page: pageNum,
                        x: tx[0],
                        y: tx[1] - hPx, // pdf.js y is bottom-left; flip to top-left
                        w: wPx,
                        h: hPx,
                    });
                }
            }

            setPages(renderedPages);
            setTextItems(allTextItems);
        } catch (err: any) {
            console.error(err);
            setLoadError("Failed to load PDF. Please try uploading again.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Search logic ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (query.trim().length < 1) {
            setMatches([]);
            setActiveIndex(0);
            return;
        }
        const regex = new RegExp(escapeRegex(query.trim()), "gi");
        const found: SearchMatch[] = [];

        for (let i = 0; i < textItems.length; i++) {
            const item = textItems[i];
            let m: RegExpExecArray | null;
            regex.lastIndex = 0;
            while ((m = regex.exec(item.text)) !== null) {
                // Approximate highlight box: fraction of word width
                const ratio = m[0].length / item.text.length;
                const startRatio = m.index / item.text.length;
                found.push({
                    itemIndex: i,
                    charStart: m.index,
                    charEnd: m.index + m[0].length,
                    page: item.page,
                    x: item.x + startRatio * item.w,
                    y: item.y,
                    w: ratio * item.w,
                    h: item.h,
                });
            }
        }

        setMatches(found);
        setActiveIndex(0);
    }, [query, textItems]);

    // ── Auto-scroll to active match ───────────────────────────────────────────

    useEffect(() => {
        if (matches.length === 0) return;
        const match = matches[activeIndex];
        if (!match) return;

        // Scroll page into view
        const pageEl = pageRefs.current[match.page - 1];
        if (pageEl) {
            pageEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Scroll match in sidebar
        const matchEl = matchRefs.current[activeIndex];
        if (matchEl) {
            matchEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [activeIndex, matches]);

    const goPrev = useCallback(() => {
        if (matches.length === 0) return;
        setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    }, [matches.length]);

    const goNext = useCallback(() => {
        if (matches.length === 0) return;
        setActiveIndex((i) => (i + 1) % matches.length);
    }, [matches.length]);

    // ── Keyboard shortcut ─────────────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "f") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === "Enter" && document.activeElement === searchInputRef.current) {
                e.shiftKey ? goPrev() : goNext();
            }
            if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
                setQuery("");
                searchInputRef.current?.blur();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [goPrev, goNext]);

    // ── Highlights for a given page ───────────────────────────────────────────

    const getHighlightsForPage = (pageNum: number) =>
        matches.map((m, idx) =>
            m.page === pageNum ? { match: m, idx } : null
        ).filter(Boolean) as { match: SearchMatch; idx: number }[];

    // ── Match snippet (sidebar) ───────────────────────────────────────────────

    const getSnippet = (match: SearchMatch) => {
        const item = textItems[match.itemIndex];
        if (!item) return "";
        const before = item.text.slice(Math.max(0, match.charStart - 20), match.charStart);
        const hit = item.text.slice(match.charStart, match.charEnd);
        const after = item.text.slice(match.charEnd, match.charEnd + 20);
        return { before, hit, after };
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="h-screen flex flex-col pt-[64px]" style={{ background: "#F7F6F3" }}>
            <Navbar />

            {/* ── Top search bar ── */}
            <div className="shrink-0 z-30 bg-white border-b border-border shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 md:py-0 md:h-14 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                    {/* Row 1 (Mobile) / Left side (Desktop): Back & File */}
                    <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                        <button
                            onClick={() => router.push("/search-pdf")}
                            className="flex items-center gap-1.5 text-sm text-brand-sage hover:text-brand-dark transition-colors cursor-pointer shrink-0"
                        >
                            <IconArrowLeft size={16} />
                            <span className="hidden sm:inline">New PDF</span>
                        </button>
                        
                        <div className="h-4 w-px bg-border shrink-0" />
                        
                        <div className="flex items-center gap-1.5 text-xs text-brand-sage truncate shrink min-w-0 flex-1">
                            <IconFileText size={14} className="shrink-0" />
                            <span className="truncate">{fileName}</span>
                        </div>
                        
                        {/* Desktop separator */}
                        <div className="hidden md:block h-5 w-px bg-border shrink-0 ml-1" />
                    </div>

                    {/* Row 2 (Mobile) / Right side (Desktop): Search & Tools */}
                    <div className="flex-1 flex items-center gap-2 min-w-0 w-full md:w-auto">
                        {/* Search input */}
                        <div className="relative flex-1 max-w-md">
                            <IconSearch
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage pointer-events-none"
                            />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search in document… (Ctrl+F)"
                                className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-border bg-white text-brand-dark placeholder:text-brand-sage/60 focus:outline-none focus:border-[#0369a1] focus:ring-2 focus:ring-[#0369a1]/20 transition-all"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-sage hover:text-brand-dark cursor-pointer"
                                >
                                    <IconX size={13} />
                                </button>
                            )}
                        </div>

                        {/* Match counter */}
                        <AnimatePresence>
                            {query.trim() && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="text-xs font-medium text-brand-sage whitespace-nowrap shrink-0"
                                >
                                    {matches.length === 0
                                        ? "No matches"
                                        : `${activeIndex + 1} / ${matches.length}`}
                                </motion.span>
                            )}
                        </AnimatePresence>

                        {/* Nav arrows */}
                        <AnimatePresence>
                            {matches.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-center gap-1 shrink-0"
                                >
                                    <button
                                        onClick={goPrev}
                                        title="Previous match (Shift+Enter)"
                                        className="p-1.5 rounded-md border border-border bg-white text-brand-dark hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <IconChevronUp size={14} />
                                    </button>
                                    <button
                                        onClick={goNext}
                                        title="Next match (Enter)"
                                        className="p-1.5 rounded-md border border-border bg-white text-brand-dark hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <IconChevronDown size={14} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ── Main layout ── */}
            <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 gap-6 min-h-0 overflow-hidden">

                {/* ── Sidebar: match list ── */}
                <AnimatePresence>
                    {query.trim() && matches.length > 0 && (
                        <motion.aside
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.2 }}
                            className="hidden lg:flex flex-col w-72 shrink-0 h-full py-6"
                        >
                            <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden h-full">
                                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                    <span className="text-xs font-semibold text-brand-dark uppercase tracking-wider">
                                        Results
                                    </span>
                                    <span
                                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: "#e0f2fe", color: "#0369a1" }}
                                    >
                                        {matches.length}
                                    </span>
                                </div>
                                <div className="overflow-y-auto flex flex-col divide-y divide-border">
                                    {matches.map((match, idx) => {
                                        const snippet = getSnippet(match);
                                        const isActive = idx === activeIndex;
                                        return (
                                            <div
                                                key={idx}
                                                ref={(el) => { matchRefs.current[idx] = el; }}
                                                onClick={() => setActiveIndex(idx)}
                                                className="px-4 py-3 cursor-pointer transition-colors"
                                                style={{
                                                    background: isActive ? "#e0f2fe" : "transparent",
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span
                                                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                                        style={{ background: "#f0f9ff", color: "#0369a1" }}
                                                    >
                                                        Page {match.page}
                                                    </span>
                                                    {isActive && (
                                                        <span className="text-[10px] font-bold text-[#0369a1]">
                                                            ← Active
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-brand-sage leading-relaxed truncate">
                                                    <span className="text-brand-sage/60">…{snippet.before}</span>
                                                    <mark
                                                        className="font-semibold rounded-sm px-0.5"
                                                        style={{ background: "#fef08a", color: "#92400e" }}
                                                    >
                                                        {snippet.hit}
                                                    </mark>
                                                    <span className="text-brand-sage/60">{snippet.after}…</span>
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* ── PDF viewer ── */}
                <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-2 pt-6 pb-12">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center gap-4 py-32">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                style={{ background: "#e0f2fe" }}
                            >
                                <IconLoader2 size={24} className="animate-spin" style={{ color: "#0369a1" }} />
                            </div>
                            <p className="text-sm text-brand-sage">Loading your PDF…</p>
                        </div>
                    )}

                    {loadError && (
                        <div className="flex flex-col items-center justify-center gap-4 py-32">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-50">
                                <IconAlertCircle size={24} className="text-red-500" />
                            </div>
                            <p className="text-sm text-red-600 font-medium">{loadError}</p>
                            <button
                                onClick={() => router.push("/search-pdf")}
                                className="text-sm text-[#0369a1] hover:underline cursor-pointer"
                            >
                                Go back and try again
                            </button>
                        </div>
                    )}

                    {!isLoading && !loadError && pages.length > 0 && (
                        <div
                            ref={scrollContainerRef}
                            className="flex flex-col gap-6 items-center"
                        >
                            {pages.map((page, pageIdx) => {
                                const pageNum = pageIdx + 1;
                                const highlights = getHighlightsForPage(pageNum);

                                return (
                                    <div
                                        key={pageIdx}
                                        ref={(el) => { pageRefs.current[pageIdx] = el; }}
                                        className="relative rounded-xl overflow-hidden shadow-lg border border-border"
                                        style={{ width: "100%", maxWidth: page.width }}
                                    >
                                        {/* Page number badge */}
                                        <div className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-md text-[11px] font-semibold select-none"
                                            style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}
                                        >
                                            {pageNum}
                                        </div>

                                        {/* PDF page image */}
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={page.dataUrl}
                                            alt={`Page ${pageNum}`}
                                            draggable={false}
                                            style={{ width: "100%", display: "block" }}
                                        />

                                        {/* Highlights overlay */}
                                        {highlights.map(({ match, idx }) => {
                                            const isActive = idx === activeIndex;
                                            // Scale from rendered px → current % of container
                                            const xPct = (match.x / page.width) * 100;
                                            const yPct = (match.y / page.height) * 100;
                                            const wPct = (match.w / page.width) * 100;
                                            const hPct = Math.max((match.h / page.height) * 100, 1.2);

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => setActiveIndex(idx)}
                                                    className="absolute cursor-pointer rounded-sm transition-all duration-150"
                                                    style={{
                                                        left: `${xPct}%`,
                                                        top: `${yPct}%`,
                                                        width: `${wPct}%`,
                                                        height: `${hPct}%`,
                                                        background: isActive
                                                            ? "rgba(251, 146, 60, 0.55)"
                                                            : "rgba(250, 204, 21, 0.45)",
                                                        outline: isActive
                                                            ? "2.5px solid #f97316"
                                                            : "1.5px solid #ca8a04",
                                                        zIndex: 10,
                                                    }}
                                                    title={`Match ${idx + 1} — Page ${pageNum}`}
                                                />
                                            );
                                        })}
                                    </div>
                                );
                            })}

                            {/* Bottom padding */}
                            <div className="h-8" />
                        </div>
                    )}
                </div>
            </div>

            {/* ── No-matches floating toast ── */}
            <AnimatePresence>
                {query.trim().length >= 1 && matches.length === 0 && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium text-white flex items-center gap-2"
                        style={{ background: "#1e293b" }}
                    >
                        <IconSearch size={15} />
                        No matches found for &ldquo;<span className="font-bold">{query}</span>&rdquo;
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Mobile FAB ── */}
            {query.trim() && matches.length > 0 && (
                <button
                    onClick={() => setIsMobileDrawerOpen(true)}
                    className="lg:hidden fixed bottom-6 right-4 w-12 h-12 rounded-full bg-[#0369a1] text-white shadow-xl flex items-center justify-center z-40 border-2 border-white active:scale-95"
                    aria-label="Search Results"
                >
                    <IconListSearch size={22} stroke={1.5} />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {matches.length}
                    </span>
                </button>
            )}

            {/* ── Mobile drawer backdrop ── */}
            <AnimatePresence>
                {isMobileDrawerOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                    />
                )}
            </AnimatePresence>

            {/* ── Mobile drawer ── */}
            <div className={`
                lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)]
                transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col
                ${isMobileDrawerOpen ? "translate-y-0" : "translate-y-full"}
            `} style={{ maxHeight: '80vh' }}>
                <div className="flex items-center justify-center pt-3 pb-2 cursor-pointer shrink-0" onClick={() => setIsMobileDrawerOpen(false)}>
                    <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
                </div>
                <div className="px-5 pb-3 flex items-center justify-between border-b border-border shrink-0">
                    <h3 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                        <IconListSearch size={16} /> Search Results
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                        {matches.length}
                    </span>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex flex-col divide-y divide-border">
                        {matches.map((match, idx) => {
                            const snippet = getSnippet(match);
                            const isActive = idx === activeIndex;
                            return (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        setActiveIndex(idx);
                                        setIsMobileDrawerOpen(false);
                                    }}
                                    className="px-4 py-3 cursor-pointer transition-colors"
                                    style={{
                                        background: isActive ? "#e0f2fe" : "transparent",
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#f0f9ff", color: "#0369a1" }}>
                                            Page {match.page}
                                        </span>
                                        {isActive && <span className="text-[10px] font-bold text-[#0369a1]">← Active</span>}
                                    </div>
                                    <p className="text-xs text-brand-sage leading-relaxed truncate">
                                        <span className="text-brand-sage/60">…{snippet.before}</span>
                                        <mark className="font-semibold rounded-sm px-0.5" style={{ background: "#fef08a", color: "#92400e" }}>
                                            {snippet.hit}
                                        </mark>
                                        <span className="text-brand-sage/60">{snippet.after}…</span>
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
