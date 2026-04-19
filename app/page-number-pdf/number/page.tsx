"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconLoader2,
    IconArrowLeft,
    IconDownload,
    IconListNumbers,
    IconCheck,
    IconChevronUp,
    IconChevronDown,
} from "@tabler/icons-react";
import { downloadBlob } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";
// ── Types ────────────────────────────────────────────────────────────────────
type Position = "TL" | "TC" | "TR" | "ML" | "MC" | "MR" | "BL" | "BC" | "BR";
type MarginPreset = "narrow" | "recommended" | "wide";

const MARGIN_VALUES: Record<MarginPreset, number> = {
    narrow: 18,
    recommended: 36,
    wide: 54,
};

const TEXT_TEMPLATES = [
    { label: "Page {n}", value: "Page {n}" },
    { label: "{n}", value: "{n}" },
    { label: "Page {n} of {total}", value: "Page {n} of {total}" },
    { label: "{n} / {total}", value: "{n} / {total}" },
    { label: "- {n} -", value: "- {n} -" },
    { label: "Custom…", value: "__custom__" },
];

const FONT_OPTIONS = [
    { label: "Arial", value: "Arial", style: { fontFamily: "Arial, sans-serif" } },
    { label: "Impact", value: "Impact", style: { fontFamily: "Impact, sans-serif", fontWeight: "bold" } },
    { label: "Arial Unicode MS", value: "Arial Unicode MS", style: { fontFamily: "Arial, sans-serif" } },
    { label: "Verdana", value: "Verdana", style: { fontFamily: "Verdana, sans-serif" } },
    { label: "Courier", value: "Courier", style: { fontFamily: "Courier New, monospace", fontStyle: "normal" } },
    { label: "Comic", value: "Comic", style: { fontFamily: "'Comic Sans MS', cursive" } },
    { label: "Times New Roman", value: "Times New Roman", style: { fontFamily: "Times New Roman, serif" } },
    { label: "Lohit Marathi", value: "Lohit Marathi", style: { fontFamily: "Arial, sans-serif", color: "#a855f7" } },
    { label: "Lohit Devanagari", value: "Lohit Devanagari", style: { fontFamily: "Arial, sans-serif", color: "#059669" } },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function PageNumberToolPage() {
    const router = useRouter();
    const hasInitialized = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Settings state ───────────────────────────────────────────────────────
    const [position, setPosition] = useState<Position>("BC");
    const [margin, setMargin] = useState<MarginPreset>("recommended");
    const [firstNumber, setFirstNumber] = useState<number | "">(1);
    const [fromPage, setFromPage] = useState<number | "">(1);
    const [toPage, setToPage] = useState<number | "">(1);
    const [textTemplate, setTextTemplate] = useState("Page {n}");
    const [customText, setCustomText] = useState("");
    const [isCustomText, setIsCustomText] = useState(false);

    // Text format
    const [fontName, setFontName] = useState("Arial");
    const [fontSize, setFontSize] = useState(12);
    const [bold, setBold] = useState(false);
    const [italic, setItalic] = useState(false);
    const [underline, setUnderline] = useState(false);
    const [textColor, setTextColor] = useState("#000000");

    // Dropdowns
    const [fontOpen, setFontOpen] = useState(false);
    const [templateOpen, setTemplateOpen] = useState(false);
    const [marginOpen, setMarginOpen] = useState(false);

    // ── Load file from FileStore ─────────────────────────────────────────────
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const f = FileStore.getFile("pagenumber_0");
        if (!f) { router.replace("/page-number-pdf"); return; }

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
            setTotalPages(n);
            setToPage(n);

            const thumbs: string[] = [];
            for (let i = 1; i <= n; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.0 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport } as any).promise;
                thumbs.push(canvas.toDataURL("image/jpeg", 0.8));
                setLoadingProgress(Math.round((i / n) * 100));
            }
            setThumbnails(thumbs);
        } catch {
            setError("Could not read PDF file.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Template change handler ───────────────────────────────────────────────
    const handleTemplateChange = (val: string) => {
        setTemplateOpen(false);
        if (val === "__custom__") {
            setIsCustomText(true);
        } else {
            setIsCustomText(false);
            setTextTemplate(val);
            setCustomText("");
        }
    };

    // ── Export ───────────────────────────────────────────────────────────────
    const handleApply = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file, file.name);
            formData.append("position", position);
            formData.append("margin", MARGIN_VALUES[margin].toString());
            const safeFirst = firstNumber === "" ? 1 : firstNumber;
            const safeFrom = fromPage === "" ? 1 : fromPage;
            const safeTo = toPage === "" ? totalPages : toPage;

            formData.append("first_number", safeFirst.toString());
            formData.append("from_page", Math.min(safeFrom, safeTo).toString());
            formData.append("to_page", Math.max(safeFrom, safeTo).toString());
            formData.append("text_template", isCustomText ? "Page {n}" : textTemplate);
            formData.append("custom_text", isCustomText ? customText : "");
            formData.append("font_name", fontName);
            formData.append("font_size", fontSize.toString());
            formData.append("bold", bold.toString());
            formData.append("italic", italic.toString());
            formData.append("underline", underline.toString());
            formData.append("text_color", textColor);

            const res = await fetch("/api/page-number-pdf", { method: "POST", body: formData });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Page numbering failed.");
            }

            const blob = await res.blob();
            const outName = res.headers.get("X-Original-Filename") ||
                file.name.replace(/\.pdf$/i, "_numbered.pdf");
            downloadBlob(blob, outName);
            setSuccess(true);
        } catch (err: any) {
            setError(err?.message || "An unexpected error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Loading screen ───────────────────────────────────────────────────────
    if (isLoading && thumbnails.length === 0) {
        return (
            <div className="min-h-screen flex flex-col bg-[#F7F6F3]">
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <IconLoader2 size={36} className="animate-spin text-[#059669]" />
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
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <IconCheck size={40} className="text-emerald-500" stroke={2} />
                        </div>
                        <h2 className="text-2xl font-bold text-brand-dark mb-4">
                            Page Numbers Added!
                        </h2>
                        <p className="text-brand-sage mb-8">
                            Your numbered PDF has been downloaded successfully.
                        </p>
                        <button
                            onClick={() => router.push("/page-number-pdf")}
                            className="bg-[#047C58] text-white px-8 py-3.5 rounded-full font-semibold hover:bg-[#036245] transition-all shadow-md hover:shadow-lg w-full"
                        >
                            Number Another PDF
                        </button>
                    </motion.div>
                </main>
            </div>
        );
    }

    // ── Main UI ───────────────────────────────────────────────────────────────
    const currentFontOption = FONT_OPTIONS.find(f => f.value === fontName) || FONT_OPTIONS[0];
    const currentTemplate = isCustomText
        ? "Custom…"
        : (TEXT_TEMPLATES.find(t => t.value === textTemplate)?.label ?? textTemplate);

    return (
        <div className="h-screen flex flex-col bg-[#F7F6F3] pt-[64px] overflow-hidden">
            <Navbar />

            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-border sticky top-0 z-40 px-4 md:px-6 py-3 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                        onClick={() => router.push("/page-number-pdf")}
                        className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full hover:bg-slate-100 transition-colors text-brand-dark shrink-0"
                        title="Back"
                    >
                        <IconArrowLeft size={20} />
                    </button>
                    <span className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-emerald-50 text-[#059669] shrink-0">
                        <IconListNumbers size={20} stroke={2} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-sm md:text-base font-bold text-brand-dark leading-tight truncate">
                            Add Page Numbers
                        </h1>
                        <p className="text-[10px] md:text-xs text-brand-sage truncate mt-0.5">
                            {file?.name} • {totalPages} pages
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 flex items-center justify-center text-sm font-medium border-b border-red-100">
                    {error}
                </div>
            )}

            {/* ── Body: preview + right panel ─────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Page grid */}
                <main className="flex-1 overflow-y-auto p-2 md:p-4">
                    <div className="w-full mx-auto flex flex-wrap justify-center gap-4 pb-12">
                        <AnimatePresence>
                            {thumbnails.map((thumb, i) => (
                                <PageThumb
                                    key={i}
                                    thumb={thumb}
                                    index={i + 1}
                                    position={position}
                                    margin={margin}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </main>

                {/* ── Right settings panel ───────────────────────────────── */}
                <aside className="w-[320px] shrink-0 border-l border-border bg-white flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5 custom-scrollbar">

                        {/* POSITION */}
                        <Section title="Position">
                            <PositionPicker value={position} onChange={setPosition} />
                        </Section>

                        {/* MARGIN */}
                        <Section title="Margin">
                            <div className="relative">
                                <button
                                    onClick={() => setMarginOpen(o => !o)}
                                    className="w-full flex items-center justify-between border border-border rounded-lg px-3 py-2 text-sm text-brand-dark bg-white hover:bg-gray-50 transition"
                                >
                                    <span className="capitalize">{margin}</span>
                                    <IconChevronDown size={14} className={`transition-transform ${marginOpen ? "rotate-180" : ""} text-brand-sage`} />
                                </button>
                                <AnimatePresence>
                                    {marginOpen && (
                                        <motion.ul
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden"
                                        >
                                            {(["narrow", "recommended", "wide"] as MarginPreset[]).map(m => (
                                                <li
                                                    key={m}
                                                    onClick={() => { setMargin(m); setMarginOpen(false); }}
                                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 hover:text-[#059669] transition capitalize ${margin === m ? "bg-emerald-50 text-[#059669] font-medium" : "text-brand-dark"}`}
                                                >
                                                    {m}
                                                </li>
                                            ))}
                                        </motion.ul>
                                    )}
                                </AnimatePresence>
                            </div>
                        </Section>

                        {/* PAGES */}
                        <Section title="Pages">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-brand-sage w-28">First number:</span>
                                    <NumberStepper
                                        value={firstNumber}
                                        min={1}
                                        onChange={setFirstNumber}
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                                    <span className="text-[11px] text-brand-sage shrink-0">From</span>
                                    <NumberStepper
                                        value={fromPage}
                                        min={1}
                                        max={totalPages}
                                        onChange={(v) => {
                                            setFromPage(v);
                                            if (typeof v === "number" && typeof toPage === "number" && v > toPage) {
                                                setToPage(v);
                                            }
                                        }}
                                    />
                                    <span className="text-[11px] text-brand-sage shrink-0">to</span>
                                    <NumberStepper
                                        value={toPage}
                                        min={typeof fromPage === "number" ? fromPage : 1}
                                        max={totalPages}
                                        onChange={setToPage}
                                    />
                                </div>
                            </div>
                        </Section>

                        {/* TEXT */}
                        <Section title="Text">
                            {/* Template dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setTemplateOpen(o => !o)}
                                    className="w-full flex items-center justify-between border border-border rounded-lg px-3 py-2 text-sm text-brand-dark bg-white hover:bg-gray-50 transition"
                                >
                                    <span>{currentTemplate}</span>
                                    <IconChevronDown size={14} className={`transition-transform ${templateOpen ? "rotate-180" : ""} text-brand-sage`} />
                                </button>
                                <AnimatePresence>
                                    {templateOpen && (
                                        <motion.ul
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden"
                                        >
                                            {TEXT_TEMPLATES.map(t => (
                                                <li
                                                    key={t.value}
                                                    onClick={() => handleTemplateChange(t.value)}
                                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 hover:text-[#059669] transition ${textTemplate === t.value && !isCustomText ? "bg-emerald-50 text-[#059669] font-medium" : "text-brand-dark"}`}
                                                >
                                                    {t.label}
                                                </li>
                                            ))}
                                        </motion.ul>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Custom text input */}
                            {isCustomText && (
                                <input
                                    type="text"
                                    value={customText}
                                    onChange={e => setCustomText(e.target.value)}
                                    placeholder="e.g. Page {n} of {total}"
                                    className="mt-2 w-full border border-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-[#059669]/30"
                                />
                            )}
                            <p className="text-[10px] text-brand-sage mt-1">
                                Use <code className="bg-gray-100 px-1 rounded">{"{n}"}</code> for page number,{" "}
                                <code className="bg-gray-100 px-1 rounded">{"{total}"}</code> for total pages.
                            </p>
                        </Section>

                        {/* TEXT FORMAT */}
                        <Section title="Text format">
                            {/* Font family */}
                            <div className="relative mb-2">
                                <button
                                    onClick={() => setFontOpen(o => !o)}
                                    className="w-full flex items-center justify-between border border-border rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 transition"
                                    style={currentFontOption.style}
                                >
                                    <span>{currentFontOption.label}</span>
                                    <IconChevronDown size={14} className={`transition-transform ${fontOpen ? "rotate-180" : ""} text-brand-sage`} />
                                </button>
                                <AnimatePresence>
                                    {fontOpen && (
                                        <motion.ul
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden"
                                        >
                                            {FONT_OPTIONS.map(f => (
                                                <li
                                                    key={f.value}
                                                    onClick={() => { setFontName(f.value); setFontOpen(false); }}
                                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 transition ${fontName === f.value ? "bg-emerald-50" : ""}`}
                                                    style={f.style}
                                                >
                                                    {f.label}
                                                </li>
                                            ))}
                                        </motion.ul>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Font size + style buttons + color */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Font size stepper */}
                                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => setFontSize(s => Math.max(6, s - 1))}
                                        className="px-2 py-1.5 text-brand-sage hover:bg-gray-50 transition text-xs"
                                    >−</button>
                                    <span className="px-2 text-sm font-medium text-brand-dark min-w-[28px] text-center">{fontSize}</span>
                                    <button
                                        onClick={() => setFontSize(s => Math.min(72, s + 1))}
                                        className="px-2 py-1.5 text-brand-sage hover:bg-gray-50 transition text-xs"
                                    >+</button>
                                </div>

                                {/* Bold */}
                                <FormatBtn active={bold} onClick={() => setBold(b => !b)} title="Bold">
                                    <strong>B</strong>
                                </FormatBtn>

                                {/* Italic */}
                                <FormatBtn active={italic} onClick={() => setItalic(i => !i)} title="Italic">
                                    <em>I</em>
                                </FormatBtn>

                                {/* Underline */}
                                <FormatBtn active={underline} onClick={() => setUnderline(u => !u)} title="Underline">
                                    <span className="underline">U</span>
                                </FormatBtn>

                                {/* Color picker */}
                                <label
                                    className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-border cursor-pointer hover:bg-gray-50 transition overflow-hidden"
                                    title="Text color"
                                >
                                    <span
                                        className="text-sm font-bold"
                                        style={{ color: textColor }}
                                    >A</span>
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-1.5"
                                        style={{ background: textColor }}
                                    />
                                    <input
                                        type="color"
                                        value={textColor}
                                        onChange={e => setTextColor(e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                </label>
                            </div>

                            {/* Live preview */}
                            <div
                                className="mt-3 bg-gray-50 border border-border rounded-lg px-3 py-2 text-center"
                                style={{
                                    fontFamily: currentFontOption.style.fontFamily,
                                    fontSize: `${Math.min(fontSize, 20)}px`,
                                    fontWeight: bold ? "bold" : "normal",
                                    fontStyle: italic ? "italic" : "normal",
                                    textDecoration: underline ? "underline" : "none",
                                    color: textColor,
                                }}
                            >
                                {isCustomText
                                    ? (customText || "Page {n}").replace("{n}", String(firstNumber === "" ? 1 : firstNumber)).replace("{total}", String(totalPages))
                                    : textTemplate.replace("{n}", String(firstNumber === "" ? 1 : firstNumber)).replace("{total}", String(totalPages))
                                }
                            </div>
                            <p className="text-[10px] text-brand-sage text-center mt-1">Preview</p>
                        </Section>
                    </div>

                    {/* Apply button (bottom of panel) - Sticky */}
                    <div className="p-4 border-t border-border bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                        <button
                            onClick={handleApply}
                            disabled={isProcessing}
                            className="w-full bg-[#047C58] text-white py-3.5 rounded-xl font-bold hover:bg-[#036245] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-[0.98]"
                        >
                            {isProcessing ? (
                                <><IconLoader2 size={18} className="animate-spin" /> Processing…</>
                            ) : (
                                <><IconDownload size={18} /> Add Page Numbers</>
                            )}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-brand-sage uppercase tracking-wide">{title}</h3>
            {children}
            <div className="border-t border-border mt-1" />
        </div>
    );
}

function FormatBtn({
    active,
    onClick,
    children,
    title,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title: string;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`w-8 h-8 rounded-lg border text-sm transition flex items-center justify-center ${active
                ? "border-[#059669] bg-emerald-50 text-[#059669]"
                : "border-border text-brand-dark hover:bg-gray-50"
                }`}
        >
            {children}
        </button>
    );
}

function NumberStepper({
    value,
    min = 1,
    max,
    onChange,
}: {
    value: number | "";
    min?: number;
    max?: number;
    onChange: (v: number | "") => void;
}) {
    const handleBlur = () => {
        if (value === "") {
            onChange(min);
        } else {
            let v = value;
            if (min !== undefined && v < min) v = min;
            if (max !== undefined && v > max) v = max;
            onChange(v);
        }
    };

    return (
        <div className="flex items-center">
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                onChange={e => {
                    if (e.target.value === "") {
                        onChange("");
                    } else {
                        onChange(parseInt(e.target.value, 10));
                    }
                }}
                onBlur={handleBlur}
                className="w-16 border border-border rounded-lg px-2 py-1 text-center text-sm font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-[#059669]/30 bg-white"
            />
        </div>
    );
}

// ── 9-position picker ───────────────────────────────────────────────────────
const POSITION_GRID: Position[][] = [
    ["TL", "TC", "TR"],
    ["ML", "MC", "MR"],
    ["BL", "BC", "BR"],
];

function PositionPicker({
    value,
    onChange,
}: {
    value: Position;
    onChange: (p: Position) => void;
}) {
    return (
        <div
            className="inline-grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(3, 2rem)" }}
        >
            {POSITION_GRID.flat().map(pos => (
                <button
                    key={pos}
                    onClick={() => onChange(pos)}
                    title={pos}
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${value === pos
                        ? "border-[#059669] bg-emerald-50"
                        : "border-border hover:border-emerald-300 hover:bg-emerald-50/40"
                        }`}
                >
                    <div
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${value === pos ? "bg-[#059669]" : "bg-gray-300"
                            }`}
                    />
                </button>
            ))}
        </div>
    );
}

// ── Page thumbnail card ─────────────────────────────────────────────────────
function PageThumb({
    thumb,
    index,
    position,
    margin
}: {
    thumb: string;
    index: number;
    position: Position;
    margin: MarginPreset;
}) {
    // Dot position calculation using percentages to be accurate on any page ratio
    const getDotStyle = () => {
        const val = margin === "narrow" ? 3 : margin === "recommended" ? 6 : 9;
        const styles: React.CSSProperties = {
            position: "absolute",
            width: "8px",
            height: "8px",
            backgroundColor: "#059669",
            borderRadius: "50%",
            boxShadow: "0 0 0 1.5px rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.2)",
            zIndex: 10,
            transition: "all 0.2s ease-out",
            transform: "translate(-50%, -50%)",
        };

        // Vertical
        if (position.includes("T")) styles.top = `${val}%`;
        else if (position.includes("B")) styles.top = `${100 - val}%`;
        else styles.top = "50%";

        // Horizontal
        if (position.includes("L")) styles.left = `${val}%`;
        else if (position.includes("R")) styles.left = `${100 - val}%`;
        else styles.left = "50%";

        return styles;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2 select-none"
            style={{ width: 140 }}
        >
            <div
                className="relative w-full rounded-xl overflow-hidden border-2 border-[#E0DED9] shadow-sm flex items-center justify-center p-1 bg-[#f3f3f3]"
                style={{ aspectRatio: "0.707" }}
            >
                {/* Content Wrapper to constrain dot to the actual image area */}
                <div className="relative inline-block max-w-full max-h-full">
                    <img
                        src={thumb}
                        alt={`Page ${index}`}
                        draggable={false}
                        className="max-w-full max-h-full block object-contain"
                    />
                    {/* Indicator Dot - constrained to image */}
                    <div style={getDotStyle()} />
                </div>
            </div>
            <div className="text-[11px] font-bold px-3 py-0.5 rounded-full text-white bg-[#8C886B] shadow-sm">
                Page {index}
            </div>
        </motion.div>
    );
}

