"use client";
import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconArrowLeft,
    IconLoader2,
    IconDownload,
    IconFileTypePdf,
    IconX,
    IconEraser,
    IconTrash,
    IconChevronUp,
    IconChevronDown,
    IconAlertTriangle,
    IconCheck,
    IconMinus,
    IconPlus,
    IconZoomIn,
    IconZoomOut,
} from "@tabler/icons-react";
import FileStore from "@/lib/file-store";
import { downloadBlob } from "@/lib/pdf-utils";
import toast from "react-hot-toast";
// ─── Types ─────────────────────────────────────────────────────────────────────

interface RedactionRect {
    id: string;
    pageIndex: number; // 0-based
    x: number;  // % of page width
    y: number;  // % of page height
    w: number;  // % of page width
    h: number;  // % of page height
}

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

// ─── PDF Rendering ─────────────────────────────────────────────────────────────

async function renderPdfPages(
    file: File,
    scale = 1.5
): Promise<{ dataUrl: string; width: number; height: number }[]> {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
    ).toString();
    const ab = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    const results: { dataUrl: string; width: number; height: number }[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
        results.push({
            dataUrl: canvas.toDataURL("image/jpeg", 0.92),
            width: vp.width,
            height: vp.height,
        });
    }
    return results;
}

// ─── Embed Redactions into PDF using pdf-lib ────────────────────────────────

async function embedRedactionsToPdf(
    file: File,
    rects: RedactionRect[],
    pageDimensions: { width: number; height: number }[]
): Promise<Uint8Array> {
    const payloadParams = JSON.stringify(
        rects.map((rect) => ({
            page: rect.pageIndex + 1,
            x_pct: rect.x,
            y_pct: rect.y,
            w_pct: rect.w,
            h_pct: rect.h
        }))
    );

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("redactions", payloadParams);

    const res = await fetch("/api/redact-pdf/apply", { method: "POST", body: formData });
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to apply secure redactions");
    }

    const blob = await res.blob();
    return new Uint8Array(await blob.arrayBuffer());
}

// ─── Page Thumbnail Sidebar ─────────────────────────────────────────────────────

function PageSidebar({
    pages,
    currentPage,
    redactions,
    onSelectPage,
}: {
    pages: { dataUrl: string }[];
    currentPage: number;
    redactions: RedactionRect[];
    onSelectPage: (i: number) => void;
}) {
    return (
        <div
            className="flex flex-col h-full bg-white border-r border-[#E0DED9] shrink-0"
            style={{ width: 140 }}
        >
            <div
                id="sidebar-scroll-container"
                className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6 bg-[#fdfdfb]"
            >
                {pages.map((pg, i) => {
                    const pageRedactions = redactions.filter(
                        (r) => r.pageIndex === i
                    );
                    return (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <button
                                id={`thumb-page-${i}`}
                                onClick={() => {
                                    onSelectPage(i);
                                    const el = document.getElementById(
                                        `pdf-page-${i}`
                                    );
                                    if (el)
                                        el.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                        });
                                }}
                                className={`relative w-full rounded-md overflow-hidden border-2 transition-all cursor-pointer group shrink-0 ${
                                    currentPage === i
                                        ? "border-[#1a1a2e] shadow-lg shadow-[#1a1a2e]/10 bg-white"
                                        : "border-transparent bg-white hover:border-[#E0DED9]"
                                }`}
                            >
                                <div className="p-1 relative">
                                    <img
                                        src={pg.dataUrl}
                                        alt={`Page ${i + 1}`}
                                        className="w-full object-contain"
                                        draggable={false}
                                    />
                                    {/* Redaction count badge */}
                                    {pageRedactions.length > 0 && (
                                        <div className="absolute top-1 right-1 bg-black text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                            {pageRedactions.length}
                                        </div>
                                    )}
                                </div>
                            </button>
                            <div
                                className={`text-[11px] font-bold transition-all px-2.5 py-0.5 rounded-full ${
                                    currentPage === i
                                        ? "bg-[#f5f4f0] text-brand-dark"
                                        : "text-brand-sage group-hover:text-brand-dark"
                                }`}
                            >
                                Page {i + 1}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Page Redaction Overlay ────────────────────────────────────────────────────

function RedactionOverlay({
    rect,
    onDelete,
    pageIndex,
    currentPageIndex,
}: {
    rect: RedactionRect;
    onDelete: () => void;
    pageIndex: number;
    currentPageIndex: number;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute select-none"
            style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.w}%`,
                height: `${rect.h}%`,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* The black redaction block */}
            <div
                className="w-full h-full bg-black relative group"
                style={{
                    boxShadow: hovered
                        ? "0 0 0 2px rgba(255,80,80,0.7)"
                        : "none",
                }}
            >
                {/* REDACTED label */}
                <span
                    className="absolute inset-0 flex items-center justify-center text-white/20 font-black tracking-widest select-none pointer-events-none"
                    style={{ fontSize: "clamp(6px, 1.5vw, 13px)" }}
                >
                    REDACTED
                </span>

                {/* Delete button shown on hover */}
                <AnimatePresence>
                    {hovered && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer z-50 transition-colors"
                            title="Remove redaction"
                        >
                            <IconX size={12} stroke={3} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// ─── Whole-Page Redaction Modal ────────────────────────────────────────────────

function WholePageModal({
    totalPages,
    onClose,
    onApply,
}: {
    totalPages: number;
    onClose: () => void;
    onApply: (pages: number[]) => void;
}) {
    const [mode, setMode] = useState<"current" | "all" | "even" | "odd" | "custom">("current");
    const [customInput, setCustomInput] = useState("");
    const [currentPageNum, setCurrentPageNum] = useState(1);

    // We pass currentPage down via a prop substitute — use a ref trick
    const currentPageRef = useRef(currentPageNum);

    const parseCustomPages = (input: string, total: number): number[] => {
        const pages: number[] = [];
        const parts = input.split(",").map((s) => s.trim());
        for (const part of parts) {
            if (part.includes("-")) {
                const [a, b] = part.split("-").map(Number);
                if (!isNaN(a) && !isNaN(b)) {
                    for (let i = a; i <= b; i++) {
                        if (i >= 1 && i <= total) pages.push(i - 1);
                    }
                }
            } else {
                const n = parseInt(part);
                if (!isNaN(n) && n >= 1 && n <= total) pages.push(n - 1);
            }
        }
        return [...new Set(pages)];
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 flex items-center justify-center p-4"
                style={{
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0DED9]">
                        <div>
                            <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2">
                                <IconEraser size={20} className="text-black" />
                                Redact Whole Pages
                            </h2>
                            <p className="text-sm text-brand-sage mt-0.5">
                                Choose which pages to fully redact
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-brand-sage hover:bg-[#f0ede4] hover:text-brand-dark transition-all cursor-pointer"
                        >
                            <IconX size={18} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Mode selection */}
                        <div className="space-y-2">
                            {(
                                [
                                    {
                                        key: "current",
                                        label: "Current page",
                                        desc: "Redact only the currently visible page",
                                    },
                                    {
                                        key: "all",
                                        label: "All pages",
                                        desc: "Redact every page in the document",
                                    },
                                    {
                                        key: "even",
                                        label: "Even pages",
                                        desc: "Redact pages 2, 4, 6…",
                                    },
                                    {
                                        key: "odd",
                                        label: "Odd pages",
                                        desc: "Redact pages 1, 3, 5…",
                                    },
                                    {
                                        key: "custom",
                                        label: "Custom range",
                                        desc: "Specify page numbers or ranges",
                                    },
                                ] as const
                            ).map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => setMode(opt.key)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                                        mode === opt.key
                                            ? "border-black bg-[#f0f0f0]"
                                            : "border-transparent bg-[#f9f9f8] hover:border-[#E0DED9]"
                                    }`}
                                >
                                    <span
                                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            mode === opt.key
                                                ? "border-black bg-black"
                                                : "border-[#C0BEB6]"
                                        }`}
                                    >
                                        {mode === opt.key && (
                                            <IconCheck
                                                size={10}
                                                color="white"
                                                stroke={3}
                                            />
                                        )}
                                    </span>
                                    <div>
                                        <p className="text-sm font-bold text-brand-dark">
                                            {opt.label}
                                        </p>
                                        <p className="text-xs text-brand-sage">
                                            {opt.desc}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Custom input */}
                        {mode === "custom" && (
                            <div className="mt-2">
                                <label className="block text-xs font-semibold text-brand-sage mb-1.5 uppercase tracking-wide">
                                    Page numbers / ranges
                                </label>
                                <input
                                    type="text"
                                    value={customInput}
                                    onChange={(e) =>
                                        setCustomInput(e.target.value)
                                    }
                                    placeholder="e.g. 1, 3, 5-8, 10"
                                    className="w-full px-3.5 py-2.5 border border-[#E0DED9] rounded-xl text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all"
                                />
                                <p className="text-xs text-brand-sage mt-1">
                                    Separate with commas. Use dash for ranges
                                    (1-3, 5).
                                </p>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3 justify-end pt-1">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-semibold text-brand-sage hover:text-brand-dark border border-[#E0DED9] rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    let pages: number[] = [];
                                    if (mode === "current") {
                                        // The parent will pass current page
                                        pages = [-1]; // signal: current page
                                    } else if (mode === "all") {
                                        pages = Array.from(
                                            { length: totalPages },
                                            (_, i) => i
                                        );
                                    } else if (mode === "even") {
                                        pages = Array.from(
                                            { length: totalPages },
                                            (_, i) => i
                                        ).filter((i) => i % 2 === 1); // 0-indexed even pages = index 1,3,5...
                                    } else if (mode === "odd") {
                                        pages = Array.from(
                                            { length: totalPages },
                                            (_, i) => i
                                        ).filter((i) => i % 2 === 0); // 0-indexed odd  pages = index 0,2,4...
                                    } else if (mode === "custom") {
                                        pages = parseCustomPages(
                                            customInput,
                                            totalPages
                                        );
                                        if (pages.length === 0) {
                                            toast.error(
                                                "No valid pages selected. Check your input."
                                            );
                                            return;
                                        }
                                    }
                                    onApply(pages);
                                }}
                                className="px-6 py-2.5 text-sm font-bold bg-black text-white rounded-xl hover:bg-[#222] transition-colors cursor-pointer"
                            >
                                Apply Redactions
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Zoom Controls ─────────────────────────────────────────────────────────────

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const ZOOM_LABELS: Record<number, string> = {
    0.5: "50%",
    0.75: "75%",
    1.0: "100%",
    1.25: "125%",
    1.5: "150%",
    2.0: "200%",
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RedactPdfPage() {
    const router = useRouter();
    const hasInit = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<
        { dataUrl: string; width: number; height: number }[]
    >([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageJump, setPageJump] = useState("1");
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const [redactions, setRedactions] = useState<RedactionRect[]>([]);
    const [zoom, setZoom] = useState(1.0);
    const [showZoomMenu, setShowZoomMenu] = useState(false);
    const [showWholePageModal, setShowWholePageModal] = useState(false);

    // Drawing state
    const drawing = useRef(false);
    const drawStart = useRef<{ x: number; y: number } | null>(null);
    const [draftRect, setDraftRect] = useState<{
        x: number;
        y: number;
        w: number;
        h: number;
    } | null>(null);
    const draftPageRef = useRef<number>(0);

    // ── Load file ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (hasInit.current) return;
        hasInit.current = true;
        const f = FileStore.getFile("redact_pdf_main");
        if (!f) {
            router.replace("/redact-pdf");
            return;
        }
        setFile(f);
        renderPdfPages(f).then((pgData) => {
            setPages(pgData);
            setIsLoading(false);
        }).catch(() => {
            toast.error("Failed to render PDF");
            setIsLoading(false);
        });
    }, [router]);

    // ── Sync sidebar scroll when current page changes ────────────────────────
    useEffect(() => {
        if (!pages.length) return;
        setPageJump((currentPage + 1).toString());
        const thumb = document.getElementById(`thumb-page-${currentPage}`);
        if (thumb) {
            thumb.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [currentPage, pages.length]);

    // ── Scroll handler ────────────────────────────────────────────────────────
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!pages.length) return;
        const container = e.currentTarget;
        const center =
            container.getBoundingClientRect().top +
            container.getBoundingClientRect().height / 2;
        let closest = currentPage;
        let minDist = Infinity;
        for (let i = 0; i < pages.length; i++) {
            const el = document.getElementById(`pdf-page-${i}`);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            const dist = Math.abs(rect.top + rect.height / 2 - center);
            if (dist < minDist) {
                minDist = dist;
                closest = i;
            }
        }
        if (closest !== currentPage) setCurrentPage(closest);
    };

    // ── Drawing handlers ──────────────────────────────────────────────────────

    const getRelativePosition = (
        e: React.MouseEvent,
        pageEl: HTMLElement
    ): { x: number; y: number } => {
        const rect = pageEl.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        };
    };

    const handlePageMouseDown = (
        e: React.MouseEvent,
        pageIndex: number
    ) => {
        e.preventDefault();
        const pageEl = document.getElementById(`pdf-page-${pageIndex}`);
        if (!pageEl) return;
        const pos = getRelativePosition(e, pageEl);
        drawing.current = true;
        drawStart.current = pos;
        draftPageRef.current = pageIndex;
        setDraftRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    };

    const handlePageMouseMove = (
        e: React.MouseEvent,
        pageIndex: number
    ) => {
        if (!drawing.current || !drawStart.current) return;
        if (pageIndex !== draftPageRef.current) return;
        const pageEl = document.getElementById(`pdf-page-${pageIndex}`);
        if (!pageEl) return;
        const pos = getRelativePosition(e, pageEl);
        const x = Math.min(drawStart.current.x, pos.x);
        const y = Math.min(drawStart.current.y, pos.y);
        const w = Math.abs(pos.x - drawStart.current.x);
        const h = Math.abs(pos.y - drawStart.current.y);
        setDraftRect({ x, y, w, h });
    };

    const handlePageMouseUp = (
        e: React.MouseEvent,
        pageIndex: number
    ) => {
        if (!drawing.current || !drawStart.current) return;
        drawing.current = false;
        const pageEl = document.getElementById(`pdf-page-${pageIndex}`);
        if (!pageEl) return;
        const pos = getRelativePosition(e, pageEl);
        const x = Math.min(drawStart.current.x, pos.x);
        const y = Math.min(drawStart.current.y, pos.y);
        const w = Math.abs(pos.x - drawStart.current.x);
        const h = Math.abs(pos.y - drawStart.current.y);

        // Only add if area is meaningful (> 0.5% in both dimensions)
        if (w > 0.5 && h > 0.5) {
            setRedactions((prev) => [
                ...prev,
                {
                    id: uid(),
                    pageIndex,
                    x,
                    y,
                    w,
                    h,
                },
            ]);
        }

        drawStart.current = null;
        setDraftRect(null);
        draftPageRef.current = 0;
    };

    // ── Whole-page redaction ──────────────────────────────────────────────────

    const applyWholePageRedactions = (pageIndices: number[]) => {
        // Replace -1 sentinel with actual current page
        const resolved = pageIndices.map((i) =>
            i === -1 ? currentPage : i
        );
        const newRects: RedactionRect[] = resolved.map((pageIndex) => ({
            id: uid(),
            pageIndex,
            x: 0,
            y: 0,
            w: 100,
            h: 100,
        }));
        // Remove existing whole-page redactions for affected pages, then add new ones
        setRedactions((prev) => {
            const filtered = prev.filter(
                (r) => !resolved.includes(r.pageIndex) || r.w !== 100 || r.h !== 100
            );
            return [...filtered, ...newRects];
        });
        setShowWholePageModal(false);
        toast.success(
            `Redacted ${resolved.length} page${resolved.length > 1 ? "s" : ""}`
        );
    };

    // ── Export ────────────────────────────────────────────────────────────────

    const handleExport = async () => {
        if (!file) return;
        if (redactions.length === 0) {
            toast.error("No redactions added yet. Draw redaction boxes first.");
            return;
        }
        setIsExporting(true);
        (async () => {
            const toastId = toast.loading("Applying redactions to PDF…");
            try {
                const bytes = await embedRedactionsToPdf(file, redactions, pages);
                // Construct Blob correctly from Uint8Array (not via unknown cast)
                const blob = new Blob([bytes as any], { type: "application/pdf" });
                const fname = file.name.replace(/\.pdf$/i, "_redacted.pdf");

                // Inline download with delayed URL revoke so browser starts download first
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = fname;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 200);

                toast.success("Redacted PDF downloaded!", { id: toastId });
            } catch (err: any) {
                toast.error(err?.message || "Export failed", { id: toastId });
            } finally {
                setIsExporting(false);
            }
        })();
    };

    // ── Zoom helpers ──────────────────────────────────────────────────────────

    const zoomIn = () => {
        const idx = ZOOM_LEVELS.indexOf(zoom);
        if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
    };
    const zoomOut = () => {
        const idx = ZOOM_LEVELS.indexOf(zoom);
        if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
    };

    // ── Loading screen ────────────────────────────────────────────────────────

    if (isLoading || !file) {
        return (
            <div
                className="min-h-screen flex flex-col"
                style={{ background: "var(--brand-white)" }}
            >
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2
                            size={36}
                            className="animate-spin text-black"
                        />
                        <p className="text-brand-sage text-sm font-medium">
                            Rendering PDF pages…
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    const canZoomIn = ZOOM_LEVELS.indexOf(zoom) < ZOOM_LEVELS.length - 1;
    const canZoomOut = ZOOM_LEVELS.indexOf(zoom) > 0;

    return (
        <div
            className="h-[calc(100vh-64px)] flex flex-col pt-16"
            style={{ background: "#fdfdfb" }}
        >
            <Navbar />

            {/* ── Secondary toolbar ── */}
            <div className="sticky top-0 z-40 w-full bg-white border-b border-[#E0DED9] px-4 py-2.5 flex items-center justify-between shadow-sm shrink-0 gap-2 flex-wrap">
                {/* Left: Back + file info */}
                <div className="flex-1 flex items-center gap-4 min-w-0">
                    <div className="flex items-center gap-3 pr-4 border-r border-[#E0DED9] shrink-0">
                        <button
                            onClick={() => router.push("/redact-pdf")}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-sage cursor-pointer hover:bg-[#f5f4f0] hover:text-brand-dark transition-all"
                            title="Back to upload"
                        >
                            <IconArrowLeft size={16} />
                            Back
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-[#f0f0f0] p-1.5 rounded-lg">
                            <IconFileTypePdf
                                size={18}
                                className="text-black"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-brand-dark truncate max-w-[160px] leading-tight">
                                {file.name}
                            </span>
                            <span className="text-[10px] text-brand-sage font-medium">
                                {pages.length} pages · {redactions.length} redactions
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center: tools + page nav */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    {/* Whole-page redact button */}
                    <button
                        onClick={() => setShowWholePageModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f4f0] border border-[#E0DED9] text-xs font-bold text-brand-dark hover:bg-[#E0DED9] transition-all cursor-pointer"
                        title="Redact whole pages"
                    >
                        <IconEraser size={14} />
                        Whole Page
                    </button>

                    {/* Clear all */}
                    <button
                        onClick={() => {
                            if (redactions.length === 0) return;
                            toast(
                                (t) => (
                                    <div className="flex flex-col gap-3 min-w-[240px]">
                                        <div className="flex items-center gap-2">
                                            <IconAlertTriangle
                                                className="text-amber-500"
                                                size={20}
                                            />
                                            <span className="font-bold text-brand-dark">
                                                Clear all redactions?
                                            </span>
                                        </div>
                                        <p className="text-xs text-brand-sage font-medium pl-8 border-l-[3px] border-amber-200 py-1">
                                            This action cannot be undone. You will lose the {redactions.length} placed boxes across {pages.length} pages.
                                        </p>
                                        <div className="flex gap-2 justify-end mt-2">
                                            <button
                                                onClick={() => toast.dismiss(t.id)}
                                                className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 text-brand-sage hover:text-brand-dark transition-all cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    toast.dismiss(t.id);
                                                    setRedactions([]);
                                                    toast.success(
                                                        "All redactions cleared!"
                                                    );
                                                }}
                                                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20 transition-all cursor-pointer"
                                            >
                                                Yes, clear all
                                            </button>
                                        </div>
                                    </div>
                                ),
                                {
                                    duration: 6000,
                                    position: "top-center",
                                }
                            );
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600 hover:bg-red-100 transition-all cursor-pointer disabled:opacity-40"
                        title="Clear all redactions"
                        disabled={redactions.length === 0}
                    >
                        <IconTrash size={14} />
                        Clear All
                    </button>

                    {/* Page navigation */}
                    <div className="flex items-center gap-2 bg-[#f5f4f0] p-1 rounded-xl border border-[#E0DED9]">
                        <button
                            onClick={() => {
                                const prev = Math.max(0, currentPage - 1);
                                document
                                    .getElementById(`pdf-page-${prev}`)
                                    ?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-20 transition-all cursor-pointer"
                            disabled={currentPage === 0}
                        >
                            <IconChevronUp size={16} />
                        </button>
                        <button
                            onClick={() => {
                                const next = Math.min(
                                    pages.length - 1,
                                    currentPage + 1
                                );
                                document
                                    .getElementById(`pdf-page-${next}`)
                                    ?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-20 transition-all cursor-pointer"
                            disabled={currentPage === pages.length - 1}
                        >
                            <IconChevronDown size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="bg-[#f5f4f0]/60 hover:bg-[#f5f4f0] border-2 border-transparent focus-within:border-brand-dark focus-within:bg-white rounded-xl px-2 py-1 transition-all">
                            <input
                                type="text"
                                className="w-8 text-center font-bold text-sm bg-transparent focus:outline-none text-brand-dark"
                                value={pageJump}
                                onChange={(e) =>
                                    setPageJump(
                                        e.target.value.replace(/\D/g, "")
                                    )
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        const val = parseInt(pageJump);
                                        if (
                                            !isNaN(val) &&
                                            val >= 1 &&
                                            val <= pages.length
                                        ) {
                                            const idx = val - 1;
                                            setCurrentPage(idx);
                                            document
                                                .getElementById(
                                                    `pdf-page-${idx}`
                                                )
                                                ?.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "start",
                                                });
                                        } else {
                                            setPageJump(
                                                (currentPage + 1).toString()
                                            );
                                        }
                                    }
                                }}
                                onBlur={() =>
                                    setPageJump((currentPage + 1).toString())
                                }
                            />
                        </div>
                        <span className="text-xs font-bold text-brand-sage">
                            / {pages.length}
                        </span>
                    </div>

                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 bg-[#f5f4f0] p-1 rounded-xl border border-[#E0DED9]">
                        <button
                            onClick={zoomOut}
                            disabled={!canZoomOut}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all cursor-pointer"
                            title="Zoom out"
                        >
                            <IconMinus size={14} />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() =>
                                    setShowZoomMenu((v) => !v)
                                }
                                className="px-2 py-1 text-xs font-bold text-brand-dark hover:bg-white rounded-lg transition-all cursor-pointer min-w-[46px] text-center"
                            >
                                {ZOOM_LABELS[zoom] ?? `${Math.round(zoom * 100)}%`}
                            </button>
                            <AnimatePresence>
                                {showZoomMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white rounded-xl border border-[#E0DED9] shadow-xl overflow-hidden z-50 min-w-[90px]"
                                    >
                                        {ZOOM_LEVELS.map((z) => (
                                            <button
                                                key={z}
                                                onClick={() => {
                                                    setZoom(z);
                                                    setShowZoomMenu(false);
                                                }}
                                                className={`w-full px-4 py-2 text-xs font-bold text-left hover:bg-[#f5f4f0] transition-colors cursor-pointer ${
                                                    zoom === z
                                                        ? "bg-black text-white hover:bg-black"
                                                        : "text-brand-dark"
                                                }`}
                                            >
                                                {ZOOM_LABELS[z]}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button
                            onClick={zoomIn}
                            disabled={!canZoomIn}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all cursor-pointer"
                            title="Zoom in"
                        >
                            <IconPlus size={14} />
                        </button>
                    </div>
                </div>

                {/* Right empty spacer to keep tools perfectly centered */}
                <div className="flex-1 hidden md:block"></div>
            </div>

            {/* ── Main layout ── */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Page thumbnails */}
                {pages.length > 0 && (
                    <div className="hidden md:flex shrink-0 h-full overflow-hidden">
                        <PageSidebar
                            pages={pages}
                            currentPage={currentPage}
                            redactions={redactions}
                            onSelectPage={setCurrentPage}
                        />
                    </div>
                )}

                {/* Center: PDF canvas */}
                <div
                    id="pdf-scroll-container"
                    className="flex-1 overflow-auto custom-scrollbar bg-[#e8e8e8] relative"
                    onScroll={handleScroll}
                    // Close zoom menu when clicking elsewhere
                    onClick={() => {
                        if (showZoomMenu) setShowZoomMenu(false);
                    }}
                >
                    <div className="py-8 flex flex-col items-center gap-8">
                        <div
                            className="flex flex-col gap-10 pb-20"
                            style={{
                                width: `${Math.min(900 * zoom, 3000)}px`,
                                maxWidth: "none",
                            }}
                        >
                            {pages.map((pg, i) => {
                                const pageRedactions = redactions.filter(
                                    (r) => r.pageIndex === i
                                );
                                const isDraftPage =
                                    drawing.current &&
                                    draftPageRef.current === i;

                                return (
                                    <div
                                        key={i}
                                        id={`pdf-page-${i}`}
                                        className="relative bg-white shadow-xl mx-auto select-none"
                                        style={{
                                            aspectRatio: `${pg.width} / ${pg.height}`,
                                            cursor: "crosshair",
                                            width: "100%",
                                            border: "1px solid #ccc",
                                        }}
                                        onMouseDown={(e) =>
                                            handlePageMouseDown(e, i)
                                        }
                                        onMouseMove={(e) =>
                                            handlePageMouseMove(e, i)
                                        }
                                        onMouseUp={(e) =>
                                            handlePageMouseUp(e, i)
                                        }
                                        onMouseLeave={(e) => {
                                            if (drawing.current) {
                                                handlePageMouseUp(e, i);
                                            }
                                        }}
                                    >
                                        {/* Page image */}
                                        <img
                                            src={pg.dataUrl}
                                            alt={`Page ${i + 1}`}
                                            className="w-full h-full object-contain select-none"
                                            draggable={false}
                                        />

                                        {/* Placed redaction overlays */}
                                        <AnimatePresence>
                                            {pageRedactions.map((rect) => (
                                                <RedactionOverlay
                                                    key={rect.id}
                                                    rect={rect}
                                                    pageIndex={i}
                                                    currentPageIndex={
                                                        currentPage
                                                    }
                                                    onDelete={() =>
                                                        setRedactions(
                                                            (prev) =>
                                                                prev.filter(
                                                                    (r) =>
                                                                        r.id !==
                                                                        rect.id
                                                                )
                                                        )
                                                    }
                                                />
                                            ))}
                                        </AnimatePresence>

                                        {/* Draft rectangle (being drawn) */}
                                        {isDraftPage && draftRect && (
                                            <div
                                                className="absolute bg-black/80 border-2 border-white/50 pointer-events-none"
                                                style={{
                                                    left: `${draftRect.x}%`,
                                                    top: `${draftRect.y}%`,
                                                    width: `${draftRect.w}%`,
                                                    height: `${draftRect.h}%`,
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: Instructions panel */}
                <div
                    className="hidden lg:flex flex-col bg-white border-l border-[#E0DED9]"
                    style={{ width: 280, minWidth: 260, maxWidth: 320 }}
                >
                    {/* Panel header */}
                    <div className="px-4 py-4 border-b border-[#E0DED9]">
                        <h3 className="text-base font-bold text-brand-dark flex items-center gap-2">
                            <IconEraser size={18} className="text-black" />
                            Redaction Tools
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
                        {/* Redaction summary */}
                        {redactions.length > 0 && (
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-sage mb-2">
                                    Redaction Summary
                                </p>
                                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {Array.from(
                                        new Set(
                                            redactions.map((r) => r.pageIndex)
                                        )
                                    )
                                        .sort((a, b) => a - b)
                                        .map((pageIdx) => {
                                            const count = redactions.filter(
                                                (r) => r.pageIndex === pageIdx
                                            ).length;
                                            return (
                                                <div
                                                    key={pageIdx}
                                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#f5f4f0] text-xs font-semibold text-brand-dark"
                                                >
                                                    <span>
                                                        Page {pageIdx + 1}
                                                    </span>
                                                    <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        {count} box
                                                        {count !== 1 ? "es" : ""}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Export button */}
                    <div className="p-4 bg-white border-t border-[#E0DED9] mt-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                        <button
                            onClick={handleExport}
                            disabled={isExporting || redactions.length === 0}
                            className="w-full py-4 rounded-xl bg-black text-white text-[15px] font-bold hover:bg-[#222] disabled:opacity-50 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-black/15 active:scale-[0.98]"
                        >
                            {isExporting ? (
                                <IconLoader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <IconDownload size={18} />
                            )}
                            {isExporting
                                ? "Exporting PDF..."
                                : "Download Redacted PDF"}
                        </button>
                        {redactions.length > 0 && (
                            <p className="text-center text-[11px] text-brand-sage mt-2 font-medium">
                                {redactions.length} redaction
                                {redactions.length !== 1 ? "s" : ""} ready to
                                apply
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile bottom bar */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E0DED9] px-4 py-3 flex items-center gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
                <button
                    onClick={handleExport}
                    disabled={isExporting || redactions.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-[#222] disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-black/20"
                >
                    {isExporting ? (
                        <IconLoader2 size={15} className="animate-spin" />
                    ) : (
                        <IconDownload size={15} />
                    )}
                    {isExporting ? "Exporting…" : "Download Redacted"}
                </button>
            </div>

            {/* Whole page modal */}
            {showWholePageModal && (
                <WholePageModal
                    totalPages={pages.length}
                    onClose={() => setShowWholePageModal(false)}
                    onApply={applyWholePageRedactions}
                />
            )}
        </div>
    );
}
