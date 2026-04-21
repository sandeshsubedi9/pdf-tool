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
    IconCrop,
    IconTrash,
    IconChevronUp,
    IconChevronDown,
    IconMinus,
    IconPlus,
    IconCopy,
    IconCheck,
    IconAlertTriangle,
    IconSettings,
} from "@tabler/icons-react";
import FileStore from "@/lib/file-store";
import toast from "react-hot-toast";
// ─── Types ─────────────────────────────────────────────────────────────────────

interface CropRect {
    id: string;
    pageIndex: number;
    x: number; // % of page width
    y: number; // % of page height
    w: number; // % of page width
    h: number; // % of page height
}

type Handle =
    | "tl" | "tc" | "tr"
    | "ml" | "mr"
    | "bl" | "bc" | "br"
    | "move";

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

// ─── Zoom ──────────────────────────────────────────────────────────────────────

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const ZOOM_LABELS: Record<number, string> = {
    0.5: "50%",
    0.75: "75%",
    1.0: "100%",
    1.25: "125%",
    1.5: "150%",
    2.0: "200%",
};

// ─── CropBox component ─────────────────────────────────────────────────────────

const HANDLE_CURSORS: Record<Handle, string> = {
    tl: "nwse-resize",
    tc: "ns-resize",
    tr: "nesw-resize",
    ml: "ew-resize",
    mr: "ew-resize",
    bl: "nesw-resize",
    bc: "ns-resize",
    br: "nwse-resize",
    move: "move",
};

// Handle positions: [top/bottom/mid] × [left/center/right]
const HANDLE_DEFS: { key: Handle; style: React.CSSProperties }[] = [
    { key: "tl", style: { top: -5, left: -5 } },
    { key: "tc", style: { top: -5, left: "calc(50% - 5px)" } },
    { key: "tr", style: { top: -5, right: -5 } },
    { key: "ml", style: { top: "calc(50% - 5px)", left: -5 } },
    { key: "mr", style: { top: "calc(50% - 5px)", right: -5 } },
    { key: "bl", style: { bottom: -5, left: -5 } },
    { key: "bc", style: { bottom: -5, left: "calc(50% - 5px)" } },
    { key: "br", style: { bottom: -5, right: -5 } },
];

function CropBox({
    rect,
    pageId,
    onUpdate,
    onDelete,
    onApplyToAll,
    isSelected,
    onSelect,
}: {
    rect: CropRect;
    pageId: string;
    onUpdate: (updated: Partial<CropRect>) => void;
    onDelete: () => void;
    onApplyToAll: () => void;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const [hovered, setHovered] = useState(false);
    const activeHandle = useRef<Handle | null>(null);
    const startRef = useRef<{
        mx: number; my: number;
        ox: number; oy: number; ow: number; oh: number;
    } | null>(null);

    // We store a ref to the current rect so our window listeners always see latest values
    const rectRef = useRef(rect);
    rectRef.current = rect;

    const getPagePct = useCallback((clientX: number, clientY: number) => {
        const pageEl = document.getElementById(pageId);
        if (!pageEl) return { px: 0, py: 0 };
        const pr = pageEl.getBoundingClientRect();
        return {
            px: ((clientX - pr.left) / pr.width) * 100,
            py: ((clientY - pr.top) / pr.height) * 100,
        };
    }, [pageId]);

    // Attach pointermove / pointerup to window so dragging outside the element still works
    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            if (!activeHandle.current || !startRef.current) return;
            const { px: cx, py: cy } = getPagePct(e.clientX, e.clientY);
            const dx = cx - startRef.current.mx;
            const dy = cy - startRef.current.my;
            const { ox, oy, ow, oh } = startRef.current;
            const MIN = 3;

            let nx = ox, ny = oy, nw = ow, nh = oh;

            switch (activeHandle.current) {
                case "move":
                    nx = Math.max(0, Math.min(100 - ow, ox + dx));
                    ny = Math.max(0, Math.min(100 - oh, oy + dy));
                    break;
                case "tl":
                    nw = Math.max(MIN, ow - dx);
                    nh = Math.max(MIN, oh - dy);
                    nx = ox + ow - nw;
                    ny = oy + oh - nh;
                    break;
                case "tc":
                    nh = Math.max(MIN, oh - dy);
                    ny = oy + oh - nh;
                    break;
                case "tr":
                    nw = Math.max(MIN, ow + dx);
                    nh = Math.max(MIN, oh - dy);
                    ny = oy + oh - nh;
                    break;
                case "ml":
                    nw = Math.max(MIN, ow - dx);
                    nx = ox + ow - nw;
                    break;
                case "mr":
                    nw = Math.max(MIN, ow + dx);
                    break;
                case "bl":
                    nw = Math.max(MIN, ow - dx);
                    nh = Math.max(MIN, oh + dy);
                    nx = ox + ow - nw;
                    break;
                case "bc":
                    nh = Math.max(MIN, oh + dy);
                    break;
                case "br":
                    nw = Math.max(MIN, ow + dx);
                    nh = Math.max(MIN, oh + dy);
                    break;
            }

            // Clamp within page
            nx = Math.max(0, Math.min(100 - nw, nx));
            ny = Math.max(0, Math.min(100 - nh, ny));
            nw = Math.min(nw, 100 - nx);
            nh = Math.min(nh, 100 - ny);

            onUpdate({ x: nx, y: ny, w: nw, h: nh });
        };

        const onUp = () => {
            activeHandle.current = null;
            startRef.current = null;
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    }, [getPagePct, onUpdate]);

    const startDrag = useCallback(
        (e: React.PointerEvent, handle: Handle) => {
            e.stopPropagation();
            e.preventDefault();
            onSelect();
            activeHandle.current = handle;
            const { px, py } = getPagePct(e.clientX, e.clientY);
            startRef.current = {
                mx: px, my: py,
                ox: rect.x, oy: rect.y, ow: rect.w, oh: rect.h,
            };
        },
        [rect, onSelect, getPagePct]
    );

    const showActions = isSelected || hovered;

    return (
        <motion.div
            id={`crop-box-${rect.id}`}
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
                zIndex: isSelected ? 30 : 20,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Interior / move handle */}
            <div
                className="absolute inset-0"
                style={{
                    cursor: "move",
                    border: `2px solid ${isSelected ? "#2563eb" : hovered ? "#818cf8" : "#6366f1"}`,
                    background: "rgba(99,102,241,0.07)",
                    boxShadow: isSelected
                        ? "0 0 0 3px rgba(37,99,235,0.2)"
                        : "none",
                    boxSizing: "border-box",
                    borderRadius: 3,
                    transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onPointerDown={(e) => startDrag(e, "move")}
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
            >
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <IconCrop
                        size={20}
                        className="opacity-20"
                        style={{ color: isSelected ? "#2563eb" : "#6366f1" }}
                    />
                </div>

                {/* Floating toolbar — visible on hover OR select */}
                <AnimatePresence>
                    {showActions && (
                        <motion.div
                            key="toolbar"
                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            transition={{ duration: 0.13 }}
                            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-xl shadow-xl border border-[#E0DED9] px-2 py-1 z-50"
                            style={{ whiteSpace: "nowrap" }}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onApplyToAll();
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer"
                                title="Apply this crop to all pages"
                            >
                                <IconCopy size={12} />
                                All Pages
                            </button>
                            <div className="w-px h-4 bg-[#E0DED9]" />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                                title="Delete crop box"
                            >
                                <IconX size={12} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 8 resize handles */}
            {HANDLE_DEFS.map(({ key, style }) => (
                <div
                    key={key}
                    className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-sm shadow-md z-40"
                    style={{ ...style, position: "absolute", cursor: HANDLE_CURSORS[key] }}
                    onPointerDown={(e) => startDrag(e, key)}
                />
            ))}
        </motion.div>
    );
}

// ─── Page Sidebar ───────────────────────────────────────────────────────────────

function PageSidebar({
    pages,
    currentPage,
    crops,
    onSelectPage,
}: {
    pages: { dataUrl: string }[];
    currentPage: number;
    crops: CropRect[];
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
                    const hasCrop = crops.some((c) => c.pageIndex === i);
                    const isActive = currentPage === i;
                    return (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <button
                                id={`thumb-page-${i}`}
                                onClick={() => {
                                    onSelectPage(i);
                                    document
                                        .getElementById(`pdf-page-${i}`)
                                        ?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                        });
                                }}
                                /* Always visible border — dark when active, grey otherwise */
                                className={`relative w-full rounded-md overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${isActive
                                        ? "border-[#1a1a2e] shadow-lg shadow-[#1a1a2e]/10 bg-white"
                                        : "border-[#D0CEC9] bg-white hover:border-[#1a1a2e]/40"
                                    }`}
                            >
                                <div className="p-1 relative">
                                    <img
                                        src={pg.dataUrl}
                                        alt={`Page ${i + 1}`}
                                        className="w-full object-contain"
                                        draggable={false}
                                    />
                                    {hasCrop && (
                                        <div className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                            <IconCheck size={8} stroke={3} />
                                        </div>
                                    )}
                                </div>
                            </button>
                            <div
                                className={`text-[11px] font-bold transition-all px-2.5 py-0.5 rounded-full ${isActive
                                        ? "bg-[#f5f4f0] text-brand-dark"
                                        : "text-brand-sage"
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CropPdfEditorPage() {
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

    const [crops, setCrops] = useState<CropRect[]>([]);
    const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1.0);
    const [showZoomMenu, setShowZoomMenu] = useState(false);
    const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);

    // Drawing state
    const drawing = useRef(false);
    const drawStart = useRef<{ x: number; y: number } | null>(null);
    const [draftRect, setDraftRect] = useState<{
        x: number; y: number; w: number; h: number;
    } | null>(null);
    const draftPageRef = useRef<number>(0);

    // ── Load file ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (hasInit.current) return;
        hasInit.current = true;
        const f = FileStore.getFile("crop_pdf_main");
        if (!f) {
            router.replace("/crop-pdf");
            return;
        }
        setFile(f);
        renderPdfPages(f)
            .then((pgData) => {
                setPages(pgData);
                setIsLoading(false);
            })
            .catch(() => {
                toast.error("Failed to render PDF");
                setIsLoading(false);
            });
    }, [router]);

    // ── Sync sidebar scroll ────────────────────────────────────────────────────
    useEffect(() => {
        if (!pages.length) return;
        setPageJump((currentPage + 1).toString());
        document
            .getElementById(`thumb-page-${currentPage}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [currentPage, pages.length]);

    // ── Scroll handler ─────────────────────────────────────────────────────────
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
            const r = el.getBoundingClientRect();
            const dist = Math.abs(r.top + r.height / 2 - center);
            if (dist < minDist) { minDist = dist; closest = i; }
        }
        if (closest !== currentPage) setCurrentPage(closest);
    };

    // ── Drawing handlers ───────────────────────────────────────────────────────

    const getRelPos = (e: React.MouseEvent, pageEl: HTMLElement) => {
        const r = pageEl.getBoundingClientRect();
        return {
            x: ((e.clientX - r.left) / r.width) * 100,
            y: ((e.clientY - r.top) / r.height) * 100,
        };
    };

    const handlePageMouseDown = (e: React.MouseEvent, pageIndex: number) => {
        if ((e.target as HTMLElement).closest("[data-crop-box]")) return;
        e.preventDefault();
        setSelectedCropId(null);
        const pageEl = document.getElementById(`pdf-page-${pageIndex}`);
        if (!pageEl) return;
        const pos = getRelPos(e, pageEl);
        drawing.current = true;
        drawStart.current = pos;
        draftPageRef.current = pageIndex;
        setDraftRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    };

    const handlePageMouseMove = (e: React.MouseEvent, pageIndex: number) => {
        if (!drawing.current || !drawStart.current) return;
        if (pageIndex !== draftPageRef.current) return;
        const pageEl = document.getElementById(`pdf-page-${pageIndex}`);
        if (!pageEl) return;
        const pos = getRelPos(e, pageEl);
        setDraftRect({
            x: Math.min(drawStart.current.x, pos.x),
            y: Math.min(drawStart.current.y, pos.y),
            w: Math.abs(pos.x - drawStart.current.x),
            h: Math.abs(pos.y - drawStart.current.y),
        });
    };

    const handlePageMouseUp = (e: React.MouseEvent, pageIndex: number) => {
        if (!drawing.current || !drawStart.current) return;
        drawing.current = false;
        const pageEl = document.getElementById(`pdf-page-${pageIndex}`);
        if (!pageEl) return;
        const pos = getRelPos(e, pageEl);
        const x = Math.min(drawStart.current.x, pos.x);
        const y = Math.min(drawStart.current.y, pos.y);
        const w = Math.abs(pos.x - drawStart.current.x);
        const h = Math.abs(pos.y - drawStart.current.y);

        if (w > 3 && h > 3) {
            const newId = uid();
            setCrops((prev) => [
                ...prev.filter((c) => c.pageIndex !== pageIndex),
                { id: newId, pageIndex, x, y, w, h },
            ]);
            setSelectedCropId(newId);
        }
        drawStart.current = null;
        setDraftRect(null);
        draftPageRef.current = 0;
    };

    // ── Crop CRUD ──────────────────────────────────────────────────────────────
    const updateCrop = useCallback((id: string, updated: Partial<CropRect>) => {
        setCrops((prev) =>
            prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
        );
    }, []);

    const deleteCrop = useCallback((id: string) => {
        setCrops((prev) => prev.filter((c) => c.id !== id));
        setSelectedCropId(null);
    }, []);

    const applyToAllPages = useCallback(
        (sourceCropId: string) => {
            const source = crops.find((c) => c.id === sourceCropId);
            if (!source) return;
            setCrops(
                Array.from({ length: pages.length }, (_, i) => ({
                    id: i === source.pageIndex ? sourceCropId : uid(),
                    pageIndex: i,
                    x: source.x,
                    y: source.y,
                    w: source.w,
                    h: source.h,
                }))
            );
            toast.success(`Crop applied to all ${pages.length} pages`);
        },
        [crops, pages.length]
    );

    // ── Clear all with confirmation ────────────────────────────────────────────
    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (crops.length === 0) return;
        toast(
            (t) => (
                <div className="flex flex-col gap-3 min-w-[240px]">
                    <div className="flex items-center gap-2">
                        <IconAlertTriangle className="text-amber-500" size={20} />
                        <span className="font-bold text-brand-dark">Clear all crops?</span>
                    </div>
                    <p className="text-xs text-brand-sage font-medium pl-8 border-l-[3px] border-amber-200 py-1">
                        {crops.length} crop box{crops.length !== 1 ? "es" : ""} across{" "}
                        {new Set(crops.map((c) => c.pageIndex)).size} page{new Set(crops.map((c) => c.pageIndex)).size !== 1 ? "s" : ""} will be removed.
                    </p>
                    <div className="flex gap-2 justify-end mt-1">
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 text-brand-sage hover:text-brand-dark transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                setCrops([]);
                                setSelectedCropId(null);
                                toast.success("All crop boxes cleared!");
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20 transition-all cursor-pointer"
                        >
                            Yes, clear all
                        </button>
                    </div>
                </div>
            ),
            { duration: 6000, position: "top-center" }
        );
    };

    // ── Export ─────────────────────────────────────────────────────────────────
    const handleExport = async () => {
        if (!file) return;
        if (crops.length === 0) {
            toast.error("Draw a crop box on at least one page first.");
            return;
        }
        setIsExporting(true);
        const toastId = toast.loading("Applying crop boxes to PDF…");
        try {
            const formData = new FormData();
            formData.append("file", file, file.name);
            formData.append("crops", JSON.stringify(
                crops.map((c) => ({ pageIndex: c.pageIndex, x: c.x, y: c.y, w: c.w, h: c.h }))
            ));
            const res = await fetch("/api/crop-pdf", { method: "POST", body: formData });
            if (!res.ok) {
                let detail = "Crop failed.";
                try { const b = await res.json(); detail = b.error || b.detail || detail; } catch { detail = (await res.text()) || detail; }
                console.error("[crop-pdf] backend error:", res.status, detail);
                // Show a friendly message — never expose raw internal errors to the user
                const friendlyMsg =
                    res.status === 400 ? detail  // 400 = user-caused (e.g. bad file), show it
                    : res.status === 413 ? "The PDF is too large to process. Try a smaller file."
                    : "Something went wrong while cropping. Please try again.";
                throw new Error(friendlyMsg);
            }
            const blob = await res.blob();
            const fname = file.name.replace(/\.pdf$/i, "_cropped.pdf");
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none"; a.href = url; a.download = fname;
            document.body.appendChild(a); a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
            toast.success("Cropped PDF downloaded!", { id: toastId });
        } catch (err: any) {
            console.error("[crop-pdf] export error:", err);
            toast.error(err?.message || "Something went wrong. Please try again.", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    // ── Zoom ──────────────────────────────────────────────────────────────────
    const zoomIn = () => {
        const idx = ZOOM_LEVELS.indexOf(zoom);
        if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
    };
    const zoomOut = () => {
        const idx = ZOOM_LEVELS.indexOf(zoom);
        if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
    };
    const canZoomIn = ZOOM_LEVELS.indexOf(zoom) < ZOOM_LEVELS.length - 1;
    const canZoomOut = ZOOM_LEVELS.indexOf(zoom) > 0;

    // ── Loading screen ─────────────────────────────────────────────────────────
    if (isLoading || !file) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: "var(--brand-white)" }}>
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-black" />
                        <p className="text-brand-sage text-sm font-medium">Rendering PDF pages…</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div
            className="h-[calc(100vh-64px)] flex flex-col pt-16"
            style={{ background: "#fdfdfb" }}
            onClick={() => { setSelectedCropId(null); if (showZoomMenu) setShowZoomMenu(false); }}
        >
            <Navbar />

            {/* ── Toolbar ── */}
            <div className="sticky top-0 z-40 w-full bg-white border-b border-[#E0DED9] shadow-sm shrink-0">
                {/* Row 1: Back + filename */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-[#E0DED9]/60">
                    <button
                        onClick={() => router.push("/crop-pdf")}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-brand-sage cursor-pointer hover:bg-[#f5f4f0] hover:text-brand-dark transition-all shrink-0"
                    >
                        <IconArrowLeft size={15} />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <div className="w-px h-4 bg-[#E0DED9] shrink-0" />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="bg-[#f0f0f0] p-1 rounded-md shrink-0">
                            <IconFileTypePdf size={14} className="text-black" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-brand-dark truncate" title={file.name}>{file.name}</p>
                            <p className="text-[10px] text-brand-sage font-medium">
                                {pages.length} page{pages.length !== 1 ? "s" : ""} · {crops.length} crop{crops.length !== 1 ? "s" : ""} set
                            </p>
                        </div>
                    </div>
                </div>

                {/* Row 2: tools */}
                <div className="flex items-center justify-center gap-2 px-4 py-2 flex-wrap">
                    <button
                        onClick={handleClearAll}
                        disabled={crops.length === 0}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100 text-xs font-bold text-red-600 hover:bg-red-100 transition-all cursor-pointer disabled:opacity-40 shrink-0"
                    >
                        <IconTrash size={13} />
                        Clear All
                    </button>

                    {/* Page nav */}
                    <div className="flex items-center gap-1 bg-[#f5f4f0] p-1 rounded-xl border border-[#E0DED9]">
                        <button
                            onClick={() => document.getElementById(`pdf-page-${Math.max(0, currentPage - 1)}`)?.scrollIntoView({ behavior: "smooth" })}
                            disabled={currentPage === 0}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-20 transition-all cursor-pointer"
                        >
                            <IconChevronUp size={14} />
                        </button>
                        <button
                            onClick={() => document.getElementById(`pdf-page-${Math.min(pages.length - 1, currentPage + 1)}`)?.scrollIntoView({ behavior: "smooth" })}
                            disabled={currentPage === pages.length - 1}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-20 transition-all cursor-pointer"
                        >
                            <IconChevronDown size={14} />
                        </button>
                    </div>

                    {/* Page jump */}
                    <div className="flex items-center gap-1">
                        <div className="bg-[#f5f4f0] border-2 border-transparent focus-within:border-brand-dark focus-within:bg-white rounded-lg px-2 py-1 transition-all">
                            <input
                                type="text"
                                className="w-6 text-center font-bold text-xs bg-transparent focus:outline-none text-brand-dark"
                                value={pageJump}
                                onChange={(e) => setPageJump(e.target.value.replace(/\D/g, ""))}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        const val = parseInt(pageJump);
                                        if (!isNaN(val) && val >= 1 && val <= pages.length) {
                                            const idx = val - 1;
                                            setCurrentPage(idx);
                                            document.getElementById(`pdf-page-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                        } else {
                                            setPageJump((currentPage + 1).toString());
                                        }
                                    }
                                }}
                                onBlur={() => setPageJump((currentPage + 1).toString())}
                            />
                        </div>
                        <span className="text-xs font-bold text-brand-sage">/ {pages.length}</span>
                    </div>

                    {/* Zoom — hidden on mobile (touch devices can't benefit from zoom controls) */}
                    <div className="hidden sm:flex items-center gap-1 bg-[#f5f4f0] p-1 rounded-xl border border-[#E0DED9]">
                        <button onClick={(e) => { e.stopPropagation(); zoomOut(); }} disabled={!canZoomOut}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all cursor-pointer">
                            <IconMinus size={13} />
                        </button>
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowZoomMenu((v) => !v); }}
                                className="px-2 py-1 text-xs font-bold text-brand-dark hover:bg-white rounded-lg transition-all cursor-pointer min-w-[40px] text-center"
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
                                            <button key={z}
                                                onClick={(e) => { e.stopPropagation(); setZoom(z); setShowZoomMenu(false); }}
                                                className={`w-full px-4 py-2 text-xs font-bold text-left hover:bg-[#f5f4f0] transition-colors cursor-pointer ${zoom === z ? "bg-black text-white hover:bg-black" : "text-brand-dark"}`}
                                            >
                                                {ZOOM_LABELS[z]}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); zoomIn(); }} disabled={!canZoomIn}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-brand-sage hover:bg-white hover:text-brand-dark hover:shadow-sm disabled:opacity-30 transition-all cursor-pointer">
                            <IconPlus size={13} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Main layout ── */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                {pages.length > 0 && (
                    <div className="hidden md:flex shrink-0 h-full overflow-hidden">
                        <PageSidebar pages={pages} currentPage={currentPage} crops={crops} onSelectPage={setCurrentPage} />
                    </div>
                )}

                {/* Center canvas */}
                <div
                    id="pdf-scroll-container"
                    className="flex-1 overflow-auto custom-scrollbar bg-[#e8e8e8] relative"
                    onScroll={handleScroll}
                    onClick={() => { setSelectedCropId(null); if (showZoomMenu) setShowZoomMenu(false); }}
                >
                    {/* Hint */}
                    <div className="sticky top-0 z-20 flex justify-center pt-3 pointer-events-none">
                        <AnimatePresence>
                            {crops.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="bg-white/95 backdrop-blur rounded-full px-4 py-1.5 shadow-lg border border-[#E0DED9] text-xs font-semibold text-brand-sage flex items-center gap-2"
                                >
                                    <IconCrop size={13} />
                                    Drag on any page to draw a crop region
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="py-8 flex flex-col items-center gap-8">
                        <div
                            className="flex flex-col gap-10 pb-24"
                            style={{ width: `min(${Math.round(900 * zoom)}px, 100%)`, paddingLeft: 2, paddingRight: 2 }}
                        >
                            {pages.map((pg, i) => {
                                const pageCrop = crops.find((c) => c.pageIndex === i);
                                const isDraftPage = drawing.current && draftPageRef.current === i;

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
                                        onMouseDown={(e) => handlePageMouseDown(e, i)}
                                        onMouseMove={(e) => handlePageMouseMove(e, i)}
                                        onMouseUp={(e) => handlePageMouseUp(e, i)}
                                        onMouseLeave={(e) => { if (drawing.current) handlePageMouseUp(e, i); }}
                                    >
                                        <img
                                            src={pg.dataUrl}
                                            alt={`Page ${i + 1}`}
                                            className="w-full h-full object-contain select-none"
                                            draggable={false}
                                        />

                                        {/* Dimming outside crop region */}
                                        {pageCrop && (
                                            <>
                                                <div className="absolute pointer-events-none bg-black/30" style={{ top: 0, left: 0, right: 0, height: `${pageCrop.y}%` }} />
                                                <div className="absolute pointer-events-none bg-black/30" style={{ top: `${pageCrop.y + pageCrop.h}%`, left: 0, right: 0, bottom: 0 }} />
                                                <div className="absolute pointer-events-none bg-black/30" style={{ top: `${pageCrop.y}%`, left: 0, width: `${pageCrop.x}%`, height: `${pageCrop.h}%` }} />
                                                <div className="absolute pointer-events-none bg-black/30" style={{ top: `${pageCrop.y}%`, left: `${pageCrop.x + pageCrop.w}%`, right: 0, height: `${pageCrop.h}%` }} />
                                            </>
                                        )}

                                        {/* Crop box */}
                                        <AnimatePresence>
                                            {pageCrop && (
                                                <div key={pageCrop.id} data-crop-box>
                                                    <CropBox
                                                        rect={pageCrop}
                                                        pageId={`pdf-page-${i}`}
                                                        isSelected={selectedCropId === pageCrop.id}
                                                        onSelect={() => setSelectedCropId(pageCrop.id)}
                                                        onUpdate={(upd) => updateCrop(pageCrop.id, upd)}
                                                        onDelete={() => deleteCrop(pageCrop.id)}
                                                        onApplyToAll={() => applyToAllPages(pageCrop.id)}
                                                    />
                                                </div>
                                            )}
                                        </AnimatePresence>

                                        {/* Draft rect while drawing */}
                                        {isDraftPage && draftRect && (
                                            <div
                                                className="absolute pointer-events-none"
                                                style={{
                                                    left: `${draftRect.x}%`,
                                                    top: `${draftRect.y}%`,
                                                    width: `${draftRect.w}%`,
                                                    height: `${draftRect.h}%`,
                                                    border: "2px dashed #6366f1",
                                                    background: "rgba(99,102,241,0.08)",
                                                    borderRadius: 3,
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right panel */}
                <div
                    className="hidden lg:flex flex-col bg-white border-l border-[#E0DED9]"
                    style={{ width: 260, minWidth: 240, maxWidth: 300 }}
                >
                    <div className="px-4 py-4 border-b border-[#E0DED9]">
                        <h3 className="text-base font-bold text-brand-dark flex items-center gap-2">
                            <IconCrop size={18} className="text-black" />
                            Crop Tools
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                        {crops.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-[#f5f4f0] flex items-center justify-center">
                                    <IconCrop size={22} className="text-brand-sage" />
                                </div>
                                <p className="text-xs text-brand-sage font-medium leading-relaxed">
                                    Drag on any page to draw a crop region. Move, resize, or delete the box, then download.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-sage mb-2">
                                    Crop Summary
                                </p>
                                <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-1">
                                    {crops.slice().sort((a, b) => a.pageIndex - b.pageIndex).map((c) => (
                                        <div
                                            key={c.id}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${selectedCropId === c.id
                                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                    : "bg-[#f5f4f0] text-brand-dark hover:bg-[#eeecea]"
                                                }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCropId(c.id);
                                                document.getElementById(`pdf-page-${c.pageIndex}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                                            }}
                                        >
                                            <span>Page {c.pageIndex + 1}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-brand-sage font-medium">
                                                    {Math.round(c.w)}×{Math.round(c.h)}%
                                                </span>
                                                <button
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); deleteCrop(c.id); }}
                                                    className="w-4 h-4 rounded-full flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                                                >
                                                    <IconX size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white border-t border-[#E0DED9] mt-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleExport(); }}
                            disabled={isExporting || crops.length === 0}
                            className="w-full py-4 rounded-xl bg-black text-white text-[15px] font-bold hover:bg-[#222] disabled:opacity-50 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-black/15 active:scale-[0.98]"
                        >
                            {isExporting ? <IconLoader2 size={18} className="animate-spin" /> : <IconDownload size={18} />}
                            {isExporting ? "Exporting PDF..." : "Download Cropped PDF"}
                        </button>
                        {crops.length > 0 && (
                            <p className="text-center text-[11px] text-brand-sage mt-2 font-medium">
                                {crops.length} page{crops.length !== 1 ? "s" : ""} will be cropped
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile FAB (open crop tools) */}
            <button
                onClick={(e) => { e.stopPropagation(); setIsMobileToolsOpen(true); }}
                className="lg:hidden fixed bottom-20 right-4 w-12 h-12 bg-black text-white rounded-full shadow-xl flex items-center justify-center z-40 border-2 border-white active:scale-95"
                aria-label="Crop Tools"
            >
                <IconSettings size={22} stroke={1.5} />
            </button>

            {/* Mobile crop tools backdrop */}
            <AnimatePresence>
                {isMobileToolsOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileToolsOpen(false)}
                        className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                    />
                )}
            </AnimatePresence>

            {/* Mobile crop tools drawer */}
            <div className={`
                lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)]
                transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                ${isMobileToolsOpen ? "translate-y-0" : "translate-y-full"}
            `}>
                <div className="flex items-center justify-center pt-3 pb-2 cursor-pointer" onClick={() => setIsMobileToolsOpen(false)}>
                    <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
                </div>
                <div className="px-5 pb-2">
                    <h3 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                        <IconCrop size={16} /> Crop Summary
                    </h3>
                </div>
                <div className="px-5 pb-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {crops.length === 0 ? (
                        <p className="text-xs text-brand-sage font-medium py-4 text-center">
                            Drag on any page to draw a crop region.
                        </p>
                    ) : (
                        <div className="space-y-1.5">
                            {crops.slice().sort((a, b) => a.pageIndex - b.pageIndex).map((c) => (
                                <div
                                    key={c.id}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#f5f4f0] text-xs font-semibold cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); setSelectedCropId(c.id); document.getElementById(`pdf-page-${c.pageIndex}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); setIsMobileToolsOpen(false); }}
                                >
                                    <span>Page {c.pageIndex + 1}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-brand-sage">{Math.round(c.w)}×{Math.round(c.h)}%</span>
                                        <button onClick={(e) => { e.stopPropagation(); deleteCrop(c.id); }} className="w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600">
                                            <IconX size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile bottom bar */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E0DED9] px-4 py-3 flex gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
                <button
                    onClick={(e) => { e.stopPropagation(); handleExport(); }}
                    disabled={isExporting || crops.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-[#222] disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-black/20"
                >
                    {isExporting ? <IconLoader2 size={15} className="animate-spin" /> : <IconDownload size={15} />}
                    {isExporting ? "Exporting…" : "Download Cropped PDF"}
                </button>
            </div>
        </div>
    );
}

