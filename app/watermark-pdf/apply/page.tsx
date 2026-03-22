"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconLoader2,
    IconArrowLeft,
    IconDownload,
    IconDroplet,
    IconCheck,
    IconChevronDown,
    IconPhoto,
    IconTypography,
    IconLayersSubtract,
    IconLayersIntersect,
    IconAlertCircle,
    IconX,
} from "@tabler/icons-react";
import { downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";

// ─── Types ────────────────────────────────────────────────────────────────────
type Position = "TL" | "TC" | "TR" | "ML" | "MC" | "MR" | "BL" | "BC" | "BR";
type WatermarkTab = "text" | "image";

const POSITION_GRID: Position[][] = [
    ["TL", "TC", "TR"],
    ["ML", "MC", "MR"],
    ["BL", "BC", "BR"],
];

const FONT_OPTIONS = [
    { label: "Arial", value: "Arial", style: { fontFamily: "Arial, sans-serif" } },
    { label: "Times New Roman", value: "Times New Roman", style: { fontFamily: "Times New Roman, serif" } },
    { label: "Courier", value: "Courier", style: { fontFamily: "Courier New, monospace" } },
    { label: "Verdana", value: "Verdana", style: { fontFamily: "Verdana, sans-serif" } },
    { label: "Impact", value: "Impact", style: { fontFamily: "Impact, sans-serif", fontWeight: "bold" } },
    { label: "Georgia", value: "Georgia", style: { fontFamily: "Georgia, serif" } },
];

const OPACITY_OPTIONS = [
    { label: "No transparency", value: 1.0 },
    { label: "75%", value: 0.75 },
    { label: "50%", value: 0.5 },
    { label: "25%", value: 0.25 },
];

const ROTATION_OPTIONS = [
    { label: "0° (no rotation)", value: 0 },
    { label: "45°", value: 45 },
    { label: "90°", value: 90 },
    { label: "180°", value: 180 },
    { label: "270°", value: 270 },
    { label: "315°", value: 315 },
];

const ACCENT = "#7C3AED";
const ACCENT_LIGHT = "rgba(124,58,237,0.08)";
const ACCENT_BORDER = "#7C3AED";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDotPositionStyle(position: Position, margin = 6): React.CSSProperties {
    const styles: React.CSSProperties = {
        position: "absolute",
        width: 10,
        height: 10,
        backgroundColor: ACCENT,
        borderRadius: "50%",
        boxShadow: "0 0 0 2px rgba(255,255,255,0.9), 0 1px 4px rgba(0,0,0,0.2)",
        zIndex: 10,
        transform: "translate(-50%, -50%)",
        transition: "all 0.2s ease-out",
    };
    if (position.includes("T")) styles.top = `${margin}%`;
    else if (position.includes("B")) styles.top = `${100 - margin}%`;
    else styles.top = "50%";
    if (position.includes("L")) styles.left = `${margin}%`;
    else if (position.includes("R")) styles.left = `${100 - margin}%`;
    else styles.left = "50%";
    return styles;
}

function getWatermarkPreviewStyle(opacity: number): React.CSSProperties {
    return {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        opacity,
        pointerEvents: "none",
        zIndex: 5,
        // The wrapper fills the page so inner absolute children resolve percentages directly to page dimensions
    };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2.5">
            <h3 className="text-[10px] font-bold text-brand-sage uppercase tracking-widest">{title}</h3>
            {children}
            <div className="border-t border-border mt-0.5" />
        </div>
    );
}

function FormatBtn({ active, onClick, children, title }: {
    active: boolean; onClick: () => void; children: React.ReactNode; title: string;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`w-8 h-8 rounded-lg border text-sm transition flex items-center justify-center cursor-pointer ${active
                ? `border-[${ACCENT}] bg-purple-50 text-purple-700`
                : "border-border text-brand-dark hover:bg-gray-50"
                }`}
            style={active ? { borderColor: ACCENT, backgroundColor: ACCENT_LIGHT, color: ACCENT } : {}}
        >
            {children}
        </button>
    );
}

function DropdownSelect({
    label, value, options, onChange,
}: {
    label: string;
    value: string | number;
    options: { label: string; value: string | number }[];
    onChange: (v: string | number) => void;
}) {
    const [open, setOpen] = useState(false);
    const current = options.find(o => o.value === value);
    return (
        <div className="flex flex-col gap-1">
            {label && <span className="text-[10px] text-brand-sage font-semibold uppercase tracking-wide">{label}</span>}
            <div className="relative">
                <button
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between border border-border rounded-lg px-3 py-2 text-sm text-brand-dark bg-white hover:bg-gray-50 transition cursor-pointer"
                >
                    <span>{current?.label ?? String(value)}</span>
                    <IconChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""} text-brand-sage`} />
                </button>
                <AnimatePresence>
                    {open && (
                        <motion.ul
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-xl overflow-hidden"
                        >
                            {options.map(opt => (
                                <li
                                    key={String(opt.value)}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 hover:text-purple-700 transition ${value === opt.value ? "bg-purple-50 text-purple-700 font-medium" : "text-brand-dark"}`}
                                >
                                    {opt.label}
                                </li>
                            ))}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function PositionPicker({ value, onChange }: { value: Position; onChange: (p: Position) => void }) {
    return (
        <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 2.25rem)" }}>
            {POSITION_GRID.flat().map(pos => (
                <button
                    key={pos}
                    onClick={() => onChange(pos)}
                    title={pos}
                    className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${value === pos
                        ? "border-purple-500 bg-purple-50"
                        : "border-border hover:border-purple-300 hover:bg-purple-50/40"
                        }`}
                >
                    <div
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${value === pos ? "bg-purple-600" : "bg-gray-300"}`}
                    />
                </button>
            ))}
        </div>
    );
}

// ─── Single Page Thumbnail Preview ───────────────────────────────────────────
function SinglePagePreview({
    thumb,
    tab,
    text,
    fontName,
    fontSize,
    bold,
    italic,
    underline,
    textColor,
    imagePreviewUrl,
    imageWidthPct,
    selectedPositions,
    opacity,
    rotation,
    showWatermark,
    pdfWidth,
}: {
    thumb: string;
    tab: WatermarkTab;
    text: string;
    fontName: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    textColor: string;
    imagePreviewUrl: string;
    imageWidthPct: number;
    selectedPositions: Position[];
    opacity: number;
    rotation: number;
    showWatermark: boolean;
    pdfWidth: number;
}) {
    const fontOpt = FONT_OPTIONS.find(f => f.value === fontName) || FONT_OPTIONS[0];

    return (
        <div
            className="relative w-full rounded-2xl border-2 border-purple-100 shadow-xl bg-[#f3f3f3]"
            style={{ overflow: "hidden", containerType: "inline-size" }}
        >
            <img src={thumb} alt="Page preview" draggable={false} className="w-full h-auto block" />

            {showWatermark && selectedPositions.map(pos => {
                const wStyle = getWatermarkPreviewStyle(opacity);
                const H: Record<string, number> = { L: 0.04, C: 0.5, R: 0.96 };
                const V: Record<string, number> = { T: 0.04, M: 0.5, B: 0.96 };
                const hFrac = H[pos[1]] ?? 0.5;
                const vFrac = V[pos[0]] ?? 0.5;

                const childStyle: React.CSSProperties = {
                    position: "absolute",
                    left: `${hFrac * 100}%`,
                    top: `${vFrac * 100}%`,
                    transform: `translate(-${hFrac * 100}%, -${vFrac * 100}%) rotate(${rotation}deg)`,
                    transformOrigin: "center",
                    transition: "all 0.3s ease-out",
                };

                return (
                    <div key={pos} style={wStyle}>
                        {tab === "text" && text.trim() && (
                            <div
                                style={{
                                    ...childStyle,
                                    fontFamily: fontOpt.style.fontFamily,
                                    fontSize: `calc(${fontSize / (pdfWidth / 100)}cqi)`,
                                    fontWeight: bold ? "bold" : "normal",
                                    fontStyle: italic ? "italic" : "normal",
                                    textDecoration: underline ? "underline" : "none",
                                    color: textColor,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    display: "inline-block",
                                    lineHeight: 1,
                                }}
                            >
                                {text}
                            </div>
                        )}

                        {tab === "image" && imagePreviewUrl && (
                            <img
                                src={imagePreviewUrl}
                                alt="watermark preview"
                                style={{
                                    ...childStyle,
                                    width: `${imageWidthPct}%`,
                                    maxWidth: "100%",
                                    display: "block",
                                }}
                                draggable={false}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Range Helper ─────────────────────────────────────────────────────────────
function parsePageRange(rangeStr: string, totalPages: number): { pages: number[], error: string | null } {
    const clean = rangeStr.toLowerCase().trim();
    if (clean === "all" || !clean) {
        return { pages: Array.from({ length: totalPages }, (_, i) => i + 1), error: null };
    }

    // Check for invalid characters
    if (/[^0-9\s,\-]/.test(clean)) {
        return { pages: [], error: "Invalid characters in page range. Use numbers, commas, and hyphens." };
    }

    const pages = new Set<number>();
    const parts = clean.split(",");

    for (const part of parts) {
        const segment = part.trim();
        if (!segment) continue;

        if (segment.includes("-")) {
            const rangeParts = segment.split("-").filter(p => p.trim() !== "");
            if (rangeParts.length !== 2) {
                return { pages: [], error: `Invalid range format: "${segment}"` };
            }

            const start = parseInt(rangeParts[0]);
            const end = parseInt(rangeParts[1]);

            if (isNaN(start) || isNaN(end)) {
                return { pages: [], error: `Invalid numbers in range: "${segment}"` };
            }
            if (start > end) {
                return { pages: [], error: `Invalid range: ${start} is greater than ${end}` };
            }
            if (start < 1 || end > totalPages) {
                return { pages: [], error: `Range ${segment} is out of bounds (1-${totalPages})` };
            }

            for (let i = start; i <= end; i++) pages.add(i);
        } else {
            const p = parseInt(segment);
            if (isNaN(p)) {
                return { pages: [], error: `Invalid page number: "${segment}"` };
            }
            if (p < 1 || p > totalPages) {
                return { pages: [], error: `Page ${p} is out of bounds (1-${totalPages})` };
            }
            pages.add(p);
        }
    }

    if (pages.size === 0) {
        return { pages: [], error: "No valid pages specified." };
    }

    return { pages: Array.from(pages).sort((a, b) => a - b), error: null };
}

// removed AllPagesPreview

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WatermarkApplyPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [pdfWidth, setPdfWidth] = useState(595); // default A4 width in pt
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Preview mode
    const [previewPageIdx, setPreviewPageIdx] = useState(0);

    // Tab
    const [tab, setTab] = useState<WatermarkTab>("text");

    // Text settings
    const [text, setText] = useState("CONFIDENTIAL");
    const [fontName, setFontName] = useState("Arial");
    const [fontSize, setFontSize] = useState(48);
    const [bold, setBold] = useState(false);
    const [italic, setItalic] = useState(false);
    const [underline, setUnderline] = useState(false);
    const [textColor, setTextColor] = useState("#7C3AED");

    // Image settings
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState("");
    const [imageWidthPct, setImageWidthPct] = useState(30);

    // Shared settings
    const [layoutMode, setLayoutMode] = useState<"single" | "multiple">("single");
    const [selectedPositions, setSelectedPositions] = useState<Position[]>(["MC"]);
    const [opacity, setOpacity] = useState(0.5);
    const [rotation, setRotation] = useState(0);
    const [pageRange, setPageRange] = useState("all");
    const [rangeError, setRangeError] = useState<string | null>(null);

    // Page range real-time validation
    useEffect(() => {
        if (totalPages > 0) {
            const res = parsePageRange(pageRange, totalPages);
            setRangeError(res.error);
        }
    }, [pageRange, totalPages]);

    // Dropdowns
    const [fontOpen, setFontOpen] = useState(false);

    // Load file
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;
        const f = FileStore.getFile("watermark_0");
        if (!f) { router.replace("/watermark-pdf"); return; }
        setFile(f);
        loadThumbnails(f);
    }, [router]);

    const loadThumbnails = useCallback(async (f: File) => {
        setIsLoading(true);
        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();
            const ab = await f.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
            const n = pdf.numPages;
            setTotalPages(n);

            const thumbs: string[] = [];
            for (let i = 1; i <= n; i++) {
                const page = await pdf.getPage(i);
                
                // Extract actual native PDF width from first page for accurate relative text scaling
                if (i === 1) {
                    setPdfWidth(page.getViewport({ scale: 1.0 }).width);
                }

                const vp = page.getViewport({ scale: 1.2 });
                const canvas = document.createElement("canvas");
                canvas.width = vp.width; canvas.height = vp.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
                thumbs.push(canvas.toDataURL("image/jpeg", 0.82));
                setLoadingProgress(Math.round((i / n) * 100));
            }
            setThumbnails(thumbs);
        } catch {
            setError("Could not read the PDF file.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setImageFile(f);
        const url = URL.createObjectURL(f);
        setImagePreviewUrl(url);
    };

    const handleApply = async () => {
        if (!file) return;
        if (tab === "image" && !imageFile) {
            setError("Please upload an image for the watermark.");
            return;
        }
        if (rangeError) {
            setError(rangeError);
            return;
        }
        setIsProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file, file.name);
            formData.append("watermark_type", tab);

            // Text params
            formData.append("text", text || "WATERMARK");
            formData.append("font_name", fontName);
            formData.append("font_size", fontSize.toString());
            formData.append("bold", bold.toString());
            formData.append("italic", italic.toString());
            formData.append("underline", underline.toString());
            formData.append("text_color", textColor);

            // Image params
            if (tab === "image" && imageFile) {
                const b64 = await fileToBase64(imageFile);
                formData.append("image_data", b64);
                formData.append("image_width_pct", imageWidthPct.toString());
            }

            // Shared
            formData.append("position", selectedPositions.join(","));
            formData.append("opacity", opacity.toString());
            formData.append("rotation", rotation.toString());
            formData.append("layer", "over");
            formData.append("page_range", pageRange.trim() || "all");

            const res = await fetch("/api/watermark-pdf", { method: "POST", body: formData });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Watermarking failed.");
            }

            const blob = await res.blob();
            const outName = res.headers.get("X-Original-Filename") || file.name.replace(/\.pdf$/i, "_watermarked.pdf");
            downloadBlob(blob, outName);
            setSuccess(true);
        } catch (err: any) {
            setError(err?.message || "An unexpected error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Loading screen ────────────────────────────────────────────────────────
    if (isLoading && thumbnails.length === 0) {
        return (
            <div className="min-h-screen flex flex-col bg-[#F7F6F3]">
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin" style={{ color: ACCENT }} />
                        <p className="text-brand-sage text-sm font-medium">
                            Reading pages ({loadingProgress}%)…
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // ── Success screen ────────────────────────────────────────────────────────
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
                        <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <IconCheck size={40} className="text-purple-600" stroke={2} />
                        </div>
                        <h2 className="text-2xl font-bold text-brand-dark mb-4">Watermark Added!</h2>
                        <p className="text-brand-sage mb-8">Your watermarked PDF has been downloaded successfully.</p>
                        <div className="flex gap-3 flex-wrap justify-center">
                            <button
                                onClick={() => setSuccess(false)}
                                className="px-6 py-3 rounded-xl bg-white text-brand-dark font-semibold border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                            >
                                Continue editing
                            </button>
                            <button
                                onClick={() => router.push("/watermark-pdf")}
                                className="px-6 py-3 rounded-xl text-white font-semibold transition cursor-pointer shadow-md"
                                style={{ backgroundColor: ACCENT }}
                            >
                                Watermark another
                            </button>
                        </div>
                    </motion.div>
                </main>
            </div>
        );
    }

    const currentFont = FONT_OPTIONS.find(f => f.value === fontName) || FONT_OPTIONS[0];

    // ── Main UI ───────────────────────────────────────────────────────────────
    return (
        <div className="h-screen flex flex-col bg-[#F7F6F3] pt-[64px] overflow-hidden">
            <Navbar />

            {/* Toolbar */}
            <div className="bg-white border-b border-border z-10 px-4 md:px-6 py-3 shadow-sm flex items-center justify-between gap-3 shrink-0 relative">
                {/* Left: File Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                        onClick={() => router.push("/watermark-pdf")}
                        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 transition-colors text-brand-dark shrink-0"
                    >
                        <IconArrowLeft size={20} />
                    </button>
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 text-white" style={{ backgroundColor: ACCENT }}>
                        <IconDroplet size={18} stroke={2} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-sm md:text-base font-bold text-brand-dark leading-tight truncate">
                            Watermark PDF
                        </h1>
                        <p className="text-[10px] md:text-xs text-brand-sage truncate mt-0.5">
                            {file?.name} · {totalPages} page{totalPages !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>

                {/* Center: Page nav */}
                {thumbnails.length > 1 && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-border shrink-0 z-20">
                        <button
                            onClick={() => setPreviewPageIdx(i => Math.max(0, i - 1))}
                            disabled={previewPageIdx === 0}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-sage hover:bg-white hover:shadow-sm hover:text-brand-dark disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                            ‹
                        </button>
                        <span className="text-[11px] text-brand-sage font-medium px-2">
                            {previewPageIdx + 1} / {thumbnails.length}
                        </span>
                        <button
                            onClick={() => setPreviewPageIdx(i => Math.min(thumbnails.length - 1, i + 1))}
                            disabled={previewPageIdx === thumbnails.length - 1}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-sage hover:bg-white hover:shadow-sm hover:text-brand-dark disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                            ›
                        </button>
                    </div>
                )}

                {/* Right: Placeholder for layout balance */}
                <div className="flex-1 flex justify-end">
                    {/* Add download button or something here later if needed */}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 flex items-center justify-center gap-2 text-sm font-medium border-b border-red-100">
                    <IconAlertCircle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600 cursor-pointer">
                        <IconX size={14} />
                    </button>
                </div>
            )}

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── Left: Preview area ─────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <div className="max-w-sm mx-auto flex flex-col gap-4">
                        {thumbnails[previewPageIdx] && (
                            <SinglePagePreview
                                thumb={thumbnails[previewPageIdx]}
                                tab={tab}
                                text={text}
                                fontName={fontName}
                                fontSize={fontSize}
                                bold={bold}
                                italic={italic}
                                underline={underline}
                                textColor={textColor}
                                imagePreviewUrl={imagePreviewUrl}
                                imageWidthPct={imageWidthPct}
                                selectedPositions={selectedPositions}
                                opacity={opacity}
                                rotation={rotation}
                                showWatermark={parsePageRange(pageRange, totalPages).pages.includes(previewPageIdx + 1)}
                                pdfWidth={pdfWidth}
                            />
                        )}
                    </div>
                </main>

                {/* ── Right: Settings panel ──────────────────────────────── */}
                <aside className="w-[300px] xl:w-[320px] shrink-0 border-l border-border bg-white flex flex-col h-full">
                    {/* Tab switcher: Text / Image (Fixed at top) */}
                    <div className="px-4 py-5 shrink-0 bg-white z-10">
                        <div className="flex rounded-xl overflow-hidden border border-border">
                            {(["text", "image"] as WatermarkTab[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all cursor-pointer ${tab === t ? "text-white" : "text-brand-sage hover:bg-slate-50"}`}
                                    style={tab === t ? { backgroundColor: ACCENT } : {}}
                                >
                                    {t === "text" ? <IconTypography size={14} /> : <IconPhoto size={14} />}
                                    {t === "text" ? "Add Text" : "Add Image"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-5 flex flex-col gap-5 custom-scrollbar">

                        {/* ── TEXT SETTINGS ─────────────────────────────── */}
                        {tab === "text" && (
                            <>
                                <Section title="Watermark text">
                                    <input
                                        type="text"
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        placeholder="e.g. CONFIDENTIAL"
                                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-purple-200"
                                    />
                                </Section>

                                <Section title="Text format">
                                    {/* Font family */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setFontOpen(o => !o)}
                                            className="w-full flex items-center justify-between border border-border rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 transition cursor-pointer"
                                            style={currentFont.style as React.CSSProperties}
                                        >
                                            <span>{currentFont.label}</span>
                                            <IconChevronDown size={14} className={`transition-transform ${fontOpen ? "rotate-180" : ""} text-brand-sage`} />
                                        </button>
                                        <AnimatePresence>
                                            {fontOpen && (
                                                <motion.ul
                                                    initial={{ opacity: 0, y: -4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -4 }}
                                                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-xl overflow-hidden"
                                                >
                                                    {FONT_OPTIONS.map(f => (
                                                        <li
                                                            key={f.value}
                                                            onClick={() => { setFontName(f.value); setFontOpen(false); }}
                                                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 hover:text-purple-700 transition ${fontName === f.value ? "bg-purple-50 text-purple-700" : "text-brand-dark"}`}
                                                            style={f.style as React.CSSProperties}
                                                        >
                                                            {f.label}
                                                        </li>
                                                    ))}
                                                </motion.ul>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Size + bold + italic + underline + color */}
                                    <div className="flex items-center gap-2 flex-wrap mt-1">
                                        <div className="flex items-center border border-border rounded-lg overflow-hidden">
                                            <button onClick={() => setFontSize(s => Math.max(8, s - 2))} className="px-2 py-1.5 text-brand-sage hover:bg-gray-50 transition text-xs cursor-pointer">−</button>
                                            <span className="px-2 text-sm font-medium text-brand-dark min-w-[32px] text-center">{fontSize}</span>
                                            <button onClick={() => setFontSize(s => Math.min(200, s + 2))} className="px-2 py-1.5 text-brand-sage hover:bg-gray-50 transition text-xs cursor-pointer">+</button>
                                        </div>
                                        <FormatBtn active={bold} onClick={() => setBold(b => !b)} title="Bold"><strong>B</strong></FormatBtn>
                                        <FormatBtn active={italic} onClick={() => setItalic(i => !i)} title="Italic"><em>I</em></FormatBtn>
                                        <FormatBtn active={underline} onClick={() => setUnderline(u => !u)} title="Underline"><span className="underline">U</span></FormatBtn>
                                        <label className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-border cursor-pointer hover:bg-gray-50 transition overflow-hidden" title="Text color">
                                            <span className="text-sm font-bold" style={{ color: textColor }}>A</span>
                                            <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: textColor }} />
                                            <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                        </label>
                                    </div>

                                </Section>
                            </>
                        )}

                        {/* ── IMAGE SETTINGS ───────────────────────────── */}
                        {tab === "image" && (
                            <Section title="Watermark image">
                                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 px-4 cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all">
                                    {imagePreviewUrl ? (
                                        <>
                                            <img src={imagePreviewUrl} alt="selected" className="max-h-20 object-contain rounded-lg shadow" />
                                            <span className="text-xs text-brand-sage">{imageFile?.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <IconPhoto size={28} className="text-brand-sage" />
                                            <span className="text-sm text-brand-sage font-medium">Click to upload image</span>
                                            <span className="text-xs text-brand-sage opacity-70">PNG, JPG, SVG, WEBP</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                                </label>

                                {imagePreviewUrl && (
                                    <button
                                        onClick={() => { setImageFile(null); setImagePreviewUrl(""); }}
                                        className="text-xs text-red-500 hover:text-red-700 transition mt-1 cursor-pointer self-start"
                                    >
                                        Remove image
                                    </button>
                                )}

                                {/* Width % */}
                                <div className="flex flex-col gap-1 mt-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-brand-sage font-semibold">Width</span>
                                        <span className="text-xs font-bold text-brand-dark">{imageWidthPct}%</span>
                                    </div>
                                    <input
                                        type="range" min={5} max={100} step={5}
                                        value={imageWidthPct}
                                        onChange={e => setImageWidthPct(Number(e.target.value))}
                                        className="w-full accent-purple-600 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[9px] text-brand-sage">
                                        <span>Small (5%)</span><span>Full</span>
                                    </div>
                                </div>
                            </Section>
                        )}

                        {/* ── SHARED SETTINGS ──────────────────────────── */}
                        <Section title="Position">
                            <div className="flex flex-col gap-4">
                                {/* Mode Toggle */}
                                <div className="flex p-1 bg-slate-100/50 rounded-xl border border-slate-200">
                                    {(["single", "multiple"] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                setLayoutMode(m);
                                                if (m === "single") {
                                                    setSelectedPositions(["MC"]);
                                                }
                                            }}
                                            className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${layoutMode === m ? "bg-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                            style={layoutMode === m ? { color: ACCENT } : {}}
                                        >
                                            {m === "single" ? "Single" : "Multiple"}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Grid Design (Restore Small & Purple) */}
                                <div className="flex items-center justify-center gap-4">
                                    <div className="grid grid-cols-3 gap-1.5 bg-white p-1.5 border border-slate-100 rounded-xl shadow-sm">
                                        {POSITION_GRID.flat().map(p => {
                                            const isActive = selectedPositions.includes(p);
                                            return (
                                                <button
                                                    key={p}
                                                    onClick={() => {
                                                        if (layoutMode === "single") {
                                                            setSelectedPositions([p]);
                                                        } else {
                                                            setSelectedPositions(prev =>
                                                                prev.includes(p)
                                                                    ? (prev.length > 1 ? prev.filter(x => x !== p) : prev)
                                                                    : [...prev, p]
                                                            );
                                                        }
                                                    }}
                                                    className={`w-9 h-9 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center ${isActive
                                                        ? "bg-purple-50"
                                                        : "border-slate-50 bg-white hover:border-slate-200"
                                                        }`}
                                                    style={isActive ? { borderColor: ACCENT } : {}}
                                                >
                                                    <div className={`w-2.5 h-2.5 rounded-full transition-all ${isActive ? "" : "bg-slate-200"}`}
                                                        style={isActive ? { backgroundColor: ACCENT } : {}} />
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {layoutMode === "multiple" && (
                                        <div className="flex flex-col items-center">
                                            <button
                                                onClick={() => {
                                                    const all = POSITION_GRID.flat();
                                                    if (selectedPositions.length === all.length) {
                                                        setSelectedPositions(["MC"]);
                                                    } else {
                                                        setSelectedPositions(all);
                                                    }
                                                }}
                                                className="flex flex-col items-center gap-2 group cursor-pointer transition-colors"
                                                style={{ color: selectedPositions.length === 9 ? ACCENT : "#94a3b8" }}
                                            >
                                                <div className="w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all"
                                                    style={selectedPositions.length === 9
                                                        ? { backgroundColor: ACCENT, borderColor: ACCENT }
                                                        : { backgroundColor: "white", borderColor: "#e2e8f0" }
                                                    }
                                                >
                                                    <IconCheck size={18} className={selectedPositions.length === 9 ? "text-white" : "text-transparent"} />
                                                </div>
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight">
                                                    Select All
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Section>

                        <Section title="Transparency">
                            <div className="grid grid-cols-2 gap-2">
                                {OPACITY_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setOpacity(opt.value)}
                                        className={`flex items-center justify-center px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${opacity === opt.value
                                            ? "border-purple-500 bg-purple-50 text-purple-700"
                                            : "border-border text-brand-sage hover:border-purple-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </Section>

                        <Section title="Rotation">
                            <DropdownSelect
                                label=""
                                value={rotation}
                                options={ROTATION_OPTIONS}
                                onChange={v => setRotation(Number(v))}
                            />
                        </Section>

                        <Section title="Page range">
                            <input
                                type="text"
                                value={pageRange}
                                onChange={e => setPageRange(e.target.value)}
                                placeholder="all, 1-3, 5-10"
                                className={`w-full border rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 transition-all ${rangeError
                                    ? "border-red-400 focus:ring-red-100 bg-red-50/20"
                                    : "border-border focus:ring-purple-200"
                                    }`}
                            />
                            {rangeError ? (
                                <p className="text-[10px] text-red-500 mt-1 flex items-start gap-1 font-medium leading-tight">
                                    <IconAlertCircle size={10} className="shrink-0 mt-0.5" />
                                    {rangeError}
                                </p>
                            ) : (
                                <p className="text-[10px] text-brand-sage mt-1 leading-tight">
                                    Use <code className="bg-gray-100 px-1 rounded text-[9px]">all</code> or ranges like <code className="bg-gray-100 px-1 rounded text-[9px]">1-3,5</code>
                                </p>
                            )}
                        </Section>
                    </div>

                    {/* Apply button */}
                    <div className="p-4 border-t border-border bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
                        <button
                            onClick={handleApply}
                            disabled={isProcessing || !!rangeError}
                            className="w-full text-white py-3.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-[0.98] cursor-pointer"
                            style={{ backgroundColor: ACCENT }}
                        >
                            {isProcessing ? (
                                <><IconLoader2 size={18} className="animate-spin" /> Applying…</>
                            ) : (
                                <><IconDownload size={18} /> Download with Watermark</>
                            )}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}

// ─── Util ─────────────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Strip data URL prefix if present: "data:image/...;base64,"
            const base64 = result.includes(",") ? result.split(",")[1] : result;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
