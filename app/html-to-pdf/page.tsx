"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import ToolLayout from "@/components/ToolLayout";
import Navbar from "@/components/Navbar";
import {
    IconWorld,
    IconLoader2,
    IconCheck,
    IconCode,
    IconFileCode,
    IconLink,
    IconUpload,
    IconEye,
    IconDownload,
    IconX,
    IconRefresh,
    IconAlertCircle,
    IconChevronRight,
    IconChevronDown,
    IconFileTypePdf,
    IconArrowLeft,
} from "@tabler/icons-react";
import { urlToPdf, downloadBlob } from "@/lib/pdf-utils";
import { FileUpload } from "@/components/ui/file-upload";
import { motion, AnimatePresence } from "motion/react";
// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "url" | "file" | "code";
type Stage = "input" | "preview" | "success";

// ─── Constants ────────────────────────────────────────────────────────────────
const SCREEN_SIZES = [
    { label: "Your screen", value: "your-screen" },
    { label: "Desktop HD (1920px)", value: "1920" },
    { label: "Desktop (1440px)", value: "1440" },
    { label: "Laptop (1280px)", value: "1280" },
    { label: "Tablet (768px)", value: "768" },
    { label: "iPhone/Mobile (430px)", value: "430" },
];

const PAGE_SIZES = [
    { label: "Fit to content", value: "fit" },
    { label: "A4 (8.27 × 11.69 in)", value: "a4" },
    { label: "A5 (5.83 × 8.27 in)", value: "a5" },
    { label: "A3 (11.69 × 16.54 in)", value: "a3" },
    { label: "Letter (8.5 × 11 in)", value: "letter" },
    { label: "Legal (8.5 × 14 in)", value: "legal" },
    { label: "Ledger (11 × 17 in)", value: "ledger" },
];

const MARGIN_OPTIONS = [
    { label: "None", value: "none", sub: "0\"" },
    { label: "Small", value: "small", sub: "0.5\"" },
    { label: "Large", value: "large", sub: "1\"" },
];

// ─── Custom Select ────────────────────────────────────────────────────────────
function CustomSelect<T extends string>({
    options,
    value,
    onChange,
    label,
}: {
    options: { label: string; value: T }[];
    value: T;
    onChange: (v: T) => void;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = options.find((o) => o.value === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className={`relative w-full ${open ? "z-50" : "z-10"}`}>
            <label className="block text-xs font-bold text-brand-sage uppercase tracking-widest mb-1.5">{label}</label>
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-brand-dark hover:border-[#F97316] transition-colors shadow-sm cursor-pointer"
            >
                <span className="truncate">{current?.label}</span>
                <IconChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.14 }}
                        className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                    >
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${value === opt.value ? "bg-[#F97316]/10 text-[#c2410c] font-semibold" : "text-brand-dark hover:bg-gray-50"}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${active
                ? "bg-[#F97316] text-white shadow-md shadow-orange-200"
                : "text-brand-sage hover:text-brand-dark hover:bg-gray-100"
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

// ─── PDF Preview Panel ────────────────────────────────────────────────────────
function PdfPreview({ pdfUrl }: { pdfUrl: string }) {
    return (
        <div className="flex flex-col gap-3 flex-1 min-h-[500px]">
            <iframe
                src={pdfUrl}
                title="PDF Preview"
                className="w-full flex-1 border-none rounded-xl bg-gray-100 min-h-[500px]"
            />
            <p className="text-xs text-brand-sage text-center bg-gray-50 py-1.5 rounded-lg border border-border">
                This is the exact PDF that will be downloaded.
            </p>
        </div>
    );
}

// ─── Generating Placeholder ───────────────────────────────────────────────────
function GeneratingPlaceholder() {
    return (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[500px] bg-gray-50 rounded-xl border border-dashed border-border gap-4">
            <IconLoader2 size={36} className="animate-spin text-[#F97316]" />
            <p className="text-sm font-semibold text-brand-sage">Generating preview PDF…</p>
            <p className="text-xs text-brand-sage opacity-70">This may take a few moments</p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HtmlToPdfPage() {
    const [activeTab, setActiveTab] = useState<Tab>("url");
    const [stage, setStage] = useState<Stage>("input");

    // URL tab state
    const [urlInput, setUrlInput] = useState("");
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);

    // File tab state
    const [htmlFiles, setHtmlFiles] = useState<File[]>([]);

    // Code tab state
    const [codeInput, setCodeInput] = useState("");

    // Shared preview / process state
    const [previewHtml, setPreviewHtml] = useState("");
    const [previewTitle, setPreviewTitle] = useState("");
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Options Sidebar state
    const [screenSize, setScreenSize] = useState<string>("your-screen");
    const [actualScreenWidth, setActualScreenWidth] = useState<number>(1280);
    const [pageSize, setPageSize] = useState<string>("a4");
    const [oneLongPage, setOneLongPage] = useState(false);
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
    const [margin, setMargin] = useState<string>("none");
    const [hideCookie, setHideCookie] = useState(true);
    const [blockAd, setBlockAd] = useState(false);

    // Tracking if options changed
    const [settingsChanged, setSettingsChanged] = useState(false);

    // Detect real screen width for 'your-screen' option
    useEffect(() => {
        setActualScreenWidth(window.innerWidth);
    }, []);

    // Compute the actual viewport width to send to Playwright
    const resolvedViewportWidth = screenSize === "your-screen"
        ? actualScreenWidth
        : parseInt(screenSize) || 1280;

    // Build dynamic 'Your screen' label
    const dynamicScreenSizes = SCREEN_SIZES.map(s =>
        s.value === "your-screen"
            ? { ...s, label: `Your screen (${actualScreenWidth}px)` }
            : s
    );

    // ── Helpers ───────────────────────────────────────────────────────────────
    // Prevent accidental page reloads/navigation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (stage !== "input") {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [stage]);

    const resetAll = () => {
        if (stage !== "input") {
            const confirmed = window.confirm("Are you sure you want to go back? Any unsaved changes will be lost.");
            if (!confirmed) return;
        }
        setStage("input");
        setPreviewHtml("");
        setPreviewTitle("");
        if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
        setError(null);
        setUrlInput("");
        setHtmlFiles([]);
        setCodeInput("");
        setSettingsChanged(false);
    };

    // ── URL: Fetch → Generate preview PDF ─────────────────────────────────────
    const handleFetchUrl = async () => {
        if (!urlInput.trim()) return;
        setIsFetchingUrl(true);
        setIsGeneratingPreview(true);
        setError(null);
        if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
        try {
            const pdfBlob = await urlToPdf({
                url: urlInput.trim(),
                pageSize,
                orientation,
                margin,
                oneLongPage,
                hideCookie,
                blockAd,
                viewportWidth: resolvedViewportWidth,
            });
            const blobUrl = URL.createObjectURL(pdfBlob);
            setPreviewPdfUrl(blobUrl);
            setPreviewTitle(urlInput.trim().replace(/^https?:\/\//, "").split("/")[0]);
            setStage("preview");
            setSettingsChanged(false);
        } catch (err: any) {
            setError(err.message || "Failed to fetch and convert URL.");
        } finally {
            setIsFetchingUrl(false);
            setIsGeneratingPreview(false);
        }
    };

    // ── File: Read → Generate preview PDF ─────────────────────────────────────
    const handleFileRead = useCallback((file: File) => {
        if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
            setError("Please upload an HTML file (.html or .htm).");
            return;
        }
        setError(null);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            setPreviewHtml(text);
            setPreviewTitle(file.name.replace(/\.(html|htm)$/i, ""));
            setPreviewPdfUrl(null);
            try {
                const pdfBlob = await urlToPdf({
                    html: text,
                    pageSize,
                    orientation,
                    margin,
                    oneLongPage,
                    hideCookie,
                    blockAd,
                    viewportWidth: resolvedViewportWidth,
                });
                setPreviewPdfUrl(URL.createObjectURL(pdfBlob));
            } catch {
                // preview generation failed - no-preview fallback
            } finally {
                setIsGeneratingPreview(false);
            }
            setStage("preview");
            setSettingsChanged(false);
        };
        setIsGeneratingPreview(true);
        reader.readAsText(file);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageSize, orientation, margin, oneLongPage, hideCookie, blockAd, resolvedViewportWidth]);

    // ── Code: Generate preview PDF ────────────────────────────────────────────
    const handleCodePreview = async () => {
        if (!codeInput.trim()) return;
        setError(null);
        setPreviewHtml(codeInput);
        setPreviewTitle("custom-html");
        setIsGeneratingPreview(true);
        setPreviewPdfUrl(null);
        try {
            const pdfBlob = await urlToPdf({
                html: codeInput,
                pageSize,
                orientation,
                margin,
                oneLongPage,
                hideCookie,
                blockAd,
                viewportWidth: resolvedViewportWidth,
            });
            setPreviewPdfUrl(URL.createObjectURL(pdfBlob));
        } catch {
            // preview failed
        } finally {
            setIsGeneratingPreview(false);
        }
        setStage("preview");
        setSettingsChanged(false);
    };

    // ── Download (already-generated PDF blob) ─────────────────────────────────
    const handleConvert = async () => {
        if (!previewHtml.trim() && !urlInput.trim()) return;
        setIsConverting(true);
        setError(null);

        try {
            let pdfBlob: Blob;

            // Logic: if preview already exists AND settings haven't changed since preview was made,
            // then we can instantly download the existing preview blob.
            if (previewPdfUrl && !settingsChanged) {
                const response = await fetch(previewPdfUrl);
                pdfBlob = await response.blob();
            } else {
                // Settings HAVE changed or preview doesn't exist, must generate fresh PDF
                pdfBlob = await urlToPdf({
                    url: activeTab === "url" ? urlInput.trim() : undefined,
                    html: activeTab !== "url" ? previewHtml : undefined,
                    pageSize,
                    orientation,
                    margin,
                    oneLongPage,
                    hideCookie,
                    blockAd,
                    viewportWidth: resolvedViewportWidth,
                });

                // Update preview as well while we are at it
                if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
                setPreviewPdfUrl(URL.createObjectURL(pdfBlob));
            }

            downloadBlob(pdfBlob, `${previewTitle || "document"}.pdf`);
            setStage("success");
            setSettingsChanged(false);
        } catch (err: any) {
            setError(err.message || "Failed to download PDF.");
        } finally {
            setIsConverting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render: Preview and Success
    // ─────────────────────────────────────────────────────────────────────────
    if (stage === "preview" || stage === "success") {
        return (
            <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
                <Navbar />

                <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

                    {/* ── SUCCESS STATE ── */}
                    {stage === "success" && (
                        <div className="bg-white rounded-2xl shadow-sm border border-border p-8 flex flex-col items-center justify-center text-center max-w-2xl mx-auto mt-12 animate-in fade-in zoom-in duration-300">
                            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                                <IconCheck size={32} stroke={2} />
                            </span>
                            <h2 className="text-xl font-bold text-brand-dark">PDF Downloaded!</h2>
                            <p className="text-brand-sage mt-2 text-sm">Your PDF has been saved to your device.</p>
                            <div className="flex gap-3 mt-6 flex-wrap justify-center">
                                <button
                                    onClick={() => setStage("preview")}
                                    className="px-6 py-3 rounded-xl bg-gray-100 text-brand-dark font-semibold hover:bg-gray-200 transition-all cursor-pointer text-sm"
                                >
                                    Back to Preview
                                </button>
                                <button
                                    onClick={resetAll}
                                    className="px-6 py-3 rounded-xl bg-[#F97316] text-white font-semibold hover:bg-[#c2410c] transition-all cursor-pointer shadow-md text-sm"
                                >
                                    Convert Another
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── PREVIEW STATE ── */}
                    {stage === "preview" && (
                        <div className="flex flex-col lg:flex-row gap-6">

                            {/* Left: PDF Preview */}
                            <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-border p-5 flex flex-col gap-4">
                                {/* Header */}
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                                        <span className="text-sm font-semibold text-brand-dark truncate max-w-[200px] md:max-w-xs">
                                            {previewTitle}
                                        </span>
                                    </div>
                                    <button
                                        onClick={resetAll}
                                        className="flex items-center gap-1.5 text-xs text-brand-sage hover:text-red-500 transition-colors cursor-pointer px-2"
                                    >
                                        <IconArrowLeft size={14} />
                                        Go Back
                                    </button>
                                </div>

                                {/* PDF Preview Area */}
                                {isGeneratingPreview ? (
                                    <GeneratingPlaceholder />
                                ) : previewPdfUrl ? (
                                    <PdfPreview pdfUrl={previewPdfUrl} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center flex-1 min-h-[500px] bg-gray-50 rounded-xl border border-dashed border-border gap-3">
                                        <IconAlertCircle size={28} className="text-brand-sage" />
                                        <p className="text-sm text-brand-sage">Preview unavailable. Click "Download PDF" to generate.</p>
                                    </div>
                                )}
                            </div>

                            {/* Right: Options Sidebar */}
                            <div className="w-full lg:w-72 xl:w-80 shrink-0">
                                <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-5 sticky top-24">
                                    <h2 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                                        <IconFileTypePdf size={18} className="text-[#F97316]" />
                                        Convert Options
                                    </h2>

                                    {/* URL input (URL tab only) */}
                                    {activeTab === "url" && (
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-bold text-brand-sage uppercase tracking-widest mb-0.5">Website URL</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={urlInput}
                                                    onChange={(e) => { setUrlInput(e.target.value); setSettingsChanged(true); }}
                                                    onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316]"
                                                />
                                                <button
                                                    onClick={handleFetchUrl}
                                                    disabled={isFetchingUrl || isGeneratingPreview || !urlInput.trim()}
                                                    className="px-3 py-2 bg-[#F97316] text-white rounded-xl hover:bg-[#c2410c] transition-colors flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                                                    title="Re-generate PDF"
                                                >
                                                    <IconRefresh size={16} className={isFetchingUrl || isGeneratingPreview ? "animate-spin" : ""} />
                                                </button>
                                            </div>
                                            {(isFetchingUrl || isGeneratingPreview) && (
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100 text-[10px] text-blue-700 animate-pulse mt-1">
                                                    <IconLoader2 size={10} className="animate-spin shrink-0" />
                                                    <span>Regenerating, this may take a few moments.</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Screen Size */}
                                    <CustomSelect
                                        label="Screen Size"
                                        options={dynamicScreenSizes}
                                        value={screenSize}
                                        onChange={(v) => { setScreenSize(v); setSettingsChanged(true); }}
                                    />

                                    <div className="h-px w-full bg-slate-100" />

                                    {/* Page Size */}
                                    <div className="flex flex-col gap-3">
                                        <CustomSelect
                                            label="Page Size"
                                            options={PAGE_SIZES}
                                            value={pageSize}
                                            onChange={(v) => { setPageSize(v); setSettingsChanged(true); }}
                                        />
                                        <label className="flex items-center gap-2 mt-1 cursor-pointer">
                                            <div
                                                className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${oneLongPage ? "bg-green-500 border-green-500" : "bg-white border-slate-300"}`}
                                                onClick={() => { setOneLongPage(!oneLongPage); setSettingsChanged(true); }}
                                            >
                                                {oneLongPage && <IconCheck size={14} className="text-white" stroke={3} />}
                                            </div>
                                            <span className="text-sm font-medium text-brand-dark select-none min-w-0" onClick={() => { setOneLongPage(!oneLongPage); setSettingsChanged(true); }}>
                                                One long page
                                            </span>
                                        </label>
                                    </div>

                                    {/* Orientation */}
                                    <div className={`transition-opacity ${oneLongPage ? "opacity-40 pointer-events-none" : ""}`}>
                                        <p className="text-xs font-bold text-brand-sage uppercase tracking-widest mb-2">Orientation</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(["portrait", "landscape"] as const).map((o) => (
                                                <button
                                                    key={o}
                                                    onClick={() => { setOrientation(o); setSettingsChanged(true); }}
                                                    className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${orientation === o
                                                        ? "border-[#F97316] bg-[#F97316]/10 text-[#c2410c]"
                                                        : "border-slate-200 text-brand-sage hover:border-slate-300"
                                                        }`}
                                                >
                                                    <span className={`border-2 rounded-sm ${o === "portrait" ? "w-6 h-8" : "w-8 h-6"} ${orientation === o ? "border-[#F97316]" : "border-slate-300"}`} />
                                                    {o.charAt(0).toUpperCase() + o.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Margin */}
                                    <div className={`transition-opacity ${oneLongPage ? "opacity-40 pointer-events-none" : ""}`}>
                                        <p className="text-xs font-bold text-brand-sage uppercase tracking-widest mb-2">Margin</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {MARGIN_OPTIONS.map((m) => (
                                                <button
                                                    key={m.value}
                                                    onClick={() => { setMargin(m.value); setSettingsChanged(true); }}
                                                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${margin === m.value
                                                        ? "border-[#F97316] bg-[#F97316]/10 text-[#c2410c]"
                                                        : "border-slate-200 text-brand-sage hover:border-slate-300"
                                                        }`}
                                                >
                                                    <span
                                                        className={`w-8 h-6 border-2 rounded-sm flex items-center justify-center ${margin === m.value ? "border-[#F97316]" : "border-slate-300"}`}
                                                        style={{ padding: m.value === "none" ? "0" : m.value === "small" ? "2px" : "4px" }}
                                                    >
                                                        <span className={`flex-1 rounded-[2px] w-full ${margin === m.value ? "bg-[#F97316]/30" : "bg-slate-200"}`} style={{ minHeight: "100%" }} />
                                                    </span>
                                                    <span>{m.label}</span>
                                                    <span className="text-[9px] opacity-60">{m.sub}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-px w-full bg-slate-100" />

                                    {/* Extra toggles */}
                                    <div className="flex flex-col gap-3">
                                        <label className="flex flex-row items-center gap-3 cursor-pointer">
                                            <div
                                                className={`relative rounded-full transition-colors duration-200 border-2 mt-0.5 ${hideCookie ? "bg-[#F97316] border-[#F97316]" : "bg-slate-200 border-slate-200"}`}
                                                onClick={() => { setHideCookie(!hideCookie); setSettingsChanged(true); }}
                                                style={{ height: "22px", width: "40px", flexShrink: 0 }}
                                            >
                                                <span className={`absolute top-px w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${hideCookie ? "translate-x-4" : "translate-x-0.5"}`} />
                                            </div>
                                            <span className="text-sm font-semibold text-brand-dark">Hide cookie dialog</span>
                                        </label>

                                        <label className="flex flex-row items-center gap-3 cursor-pointer">
                                            <div
                                                className={`relative rounded-full transition-colors duration-200 border-2 mt-0.5 ${blockAd ? "bg-[#F97316] border-[#F97316]" : "bg-slate-200 border-slate-200"}`}
                                                onClick={() => { setBlockAd(!blockAd); setSettingsChanged(true); }}
                                                style={{ height: "22px", width: "40px", flexShrink: 0 }}
                                            >
                                                <span className={`absolute top-px w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${blockAd ? "translate-x-4" : "translate-x-0.5"}`} />
                                            </div>
                                            <span className="text-sm font-semibold text-brand-dark">Try to block ads</span>
                                        </label>
                                    </div>

                                    {/* Error */}
                                    {error && (
                                        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
                                            <span className="w-1.5 h-1.5 mt-1 rounded-full bg-red-500 shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    {/* Download PDF Button */}
                                    <button
                                        onClick={handleConvert}
                                        disabled={isConverting || isGeneratingPreview}
                                        className={`w-full mt-2 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md text-sm cursor-pointer ${isConverting || isGeneratingPreview
                                            ? "bg-[#F97316] opacity-60 cursor-wait shadow-none"
                                            : "bg-[#F97316] hover:bg-[#c2410c]"
                                            }`}
                                    >
                                        {isConverting ? (
                                            <span className="flex flex-col items-center">
                                                <span className="flex items-center gap-2">
                                                    <IconLoader2 size={18} className="animate-spin" />
                                                    {settingsChanged ? "Regenerating & Downloading..." : "Downloading..."}
                                                </span>
                                                <span className="text-[10px] font-normal opacity-70">This may take a few moments</span>
                                            </span>
                                        ) : (
                                            <>
                                                <IconDownload size={18} />
                                                {settingsChanged ? "Download without Preview" : "Download PDF"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}
                </main>

                {/* Floating "Regenerate Preview" button when settings changed */}
                <AnimatePresence>
                    {stage === "preview" && settingsChanged && (
                        <motion.button
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                if (activeTab === "url" && urlInput.trim()) {
                                    handleFetchUrl();
                                } else if (activeTab === "code" && codeInput.trim()) {
                                    handleCodePreview();
                                } else {
                                    setSettingsChanged(false);
                                }
                            }}
                            className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-6 py-4 bg-[#1E1E1E] hover:bg-black text-white rounded-full font-bold shadow-2xl shadow-black/40 transition-colors cursor-pointer"
                        >
                            {isFetchingUrl || isGeneratingPreview ? (
                                <>
                                    <IconLoader2 size={20} className="animate-spin" />
                                    <span className="flex flex-col items-start">
                                        <span>Generating…</span>
                                        <span className="text-xs font-normal opacity-70">Don&apos;t close this tab</span>
                                    </span>
                                </>
                            ) : (
                                <>
                                    <IconRefresh size={20} />
                                    Regenerate Preview
                                </>
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render: Input
    // ─────────────────────────────────────────────────────────────────────────
    const descriptionContent = (
        <div className="flex flex-col gap-5 mt-4">
            <p className="text-brand-sage leading-relaxed">
                Save web content for offline use with PDF Maya’s HTML to PDF tool. Convert URLs or HTML code into clean, printable PDF documents.
            </p>
            <h2 className="text-xl font-bold text-brand-dark mt-2">Key Features & Benefits</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Web Archiving:</strong> Save articles, reports, or invoices from websites.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Print Optimization:</strong> Remove ads and sidebars for a clean reading experience.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Code Conversion:</strong> Paste raw HTML code to generate a PDF.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span><strong>Offline Access:</strong> View web content without an internet connection.</span>
                </li>
            </ul>
            <h2 className="text-xl font-bold text-brand-dark mt-2">When to Use This Tool</h2>
            <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span>Research: Save online articles for reference.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span>Invoicing: Convert web-generated invoices to PDF for records.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-brand-sage leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F97316]" />
                    <span>Documentation: Archive web pages for compliance or proof.</span>
                </li>
            </ul>
            <p className="text-sm font-medium text-brand-dark mt-2">
                Capture the web with our HTML to PDF converter.
            </p>
        </div>
    );

    return (
        <ToolLayout
            title="HTML to PDF - Convert Web Pages to Downloadable Documents"
            description={descriptionContent}
            icon={<IconWorld size={28} stroke={1.5} />}
            accentColor="#F97316"
        >
            <div className="flex flex-col gap-4">

                {/* ── INPUT STATE ── */}
                {stage === "input" && (
                    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                        {/* Tab bar */}
                        <div className="flex items-center gap-2 p-3 border-b border-border bg-gray-50/60">
                            <TabBtn
                                active={activeTab === "url"}
                                onClick={() => { setActiveTab("url"); setError(null); }}
                                icon={<IconLink size={15} />}
                                label="From URL"
                            />
                            <TabBtn
                                active={activeTab === "file"}
                                onClick={() => { setActiveTab("file"); setError(null); }}
                                icon={<IconFileCode size={15} />}
                                label="Upload HTML"
                            />
                            <TabBtn
                                active={activeTab === "code"}
                                onClick={() => { setActiveTab("code"); setError(null); }}
                                icon={<IconCode size={15} />}
                                label="Paste Code"
                            />
                        </div>

                        <div className="p-5 md:p-6">
                            {/* ── URL TAB ── */}
                            {activeTab === "url" && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="url-input" className="text-sm font-semibold text-brand-dark">
                                            Enter a webpage URL
                                        </label>
                                        <p className="text-xs text-brand-sage">
                                            We'll render the page in a real browser and convert it to a PDF.
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sage">
                                                <IconLink size={16} />
                                            </span>
                                            <input
                                                id="url-input"
                                                type="url"
                                                placeholder="https://example.com"
                                                value={urlInput}
                                                onChange={(e) => { setUrlInput(e.target.value); setError(null); }}
                                                onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
                                                className="w-full pl-9 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316] bg-gray-50 transition-all"
                                            />
                                        </div>
                                        <button
                                            onClick={handleFetchUrl}
                                            disabled={!urlInput.trim() || isFetchingUrl}
                                            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-white text-sm transition-all shadow-sm whitespace-nowrap ${!urlInput.trim()
                                                ? "bg-[#F97316]/30 cursor-not-allowed"
                                                : isFetchingUrl
                                                    ? "bg-[#F97316] opacity-60 cursor-wait"
                                                    : "bg-[#F97316] hover:bg-[#c2410c] cursor-pointer"
                                                }`}
                                        >
                                            {isFetchingUrl ? (
                                                <IconLoader2 size={16} className="animate-spin" />
                                            ) : (
                                                <IconEye size={16} />
                                            )}
                                            {isFetchingUrl ? "Fetching…" : "Preview"}
                                        </button>
                                    </div>

                                    {/* Loading hint */}
                                    {(isFetchingUrl || isGeneratingPreview) && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 animate-pulse">
                                            <IconLoader2 size={13} className="animate-spin shrink-0" />
                                            <span>Generating your PDF preview, this may take a few moments. Don&apos;t close this tab.</span>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100 text-xs text-orange-700">
                                        <IconAlertCircle size={15} className="shrink-0 mt-0.5" />
                                        <span>
                                            Some websites block external requests. If a page fails to load, try
                                            downloading the page and uploading the HTML file instead.
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* ── FILE TAB ── */}
                            {activeTab === "file" && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-brand-dark">
                                            Upload an HTML file
                                        </label>
                                        <p className="text-xs text-brand-sage">
                                            Accepts .html and .htm files.
                                        </p>
                                    </div>

                                    <FileUpload
                                        accept={{ "text/html": [".html", ".htm"] }}
                                        multiple={false}
                                        files={htmlFiles}
                                        setFiles={setHtmlFiles}
                                    />

                                    {htmlFiles.length > 0 && (
                                        <button
                                            onClick={() => handleFileRead(htmlFiles[0])}
                                            disabled={isGeneratingPreview}
                                            className={`flex items-center gap-2 w-full justify-center py-3 rounded-xl bg-[#F97316] text-white font-semibold text-sm hover:bg-[#c2410c] transition-all cursor-pointer shadow-md ${isGeneratingPreview ? "opacity-60 cursor-wait" : ""}`}
                                        >
                                            {isGeneratingPreview ? (
                                                <IconLoader2 size={16} className="animate-spin" />
                                            ) : (
                                                <IconEye size={16} />
                                            )}
                                            {isGeneratingPreview ? "Processing..." : "Preview HTML"}
                                            {!isGeneratingPreview && <IconChevronRight size={15} />}
                                        </button>
                                    )}

                                    {/* Loading hint */}
                                    {isGeneratingPreview && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 animate-pulse">
                                            <IconLoader2 size={13} className="animate-spin shrink-0" />
                                            <span>Generating your PDF preview, this may take a few moments. Don&apos;t close this tab.</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── CODE TAB ── */}
                            {activeTab === "code" && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="html-code-input" className="text-sm font-semibold text-brand-dark">
                                            Paste your HTML code
                                        </label>
                                        <p className="text-xs text-brand-sage">
                                            Paste any valid HTML snippet or a full document.
                                        </p>
                                    </div>

                                    <div className="relative">
                                        <div className="flex items-center gap-2 px-3 py-2 bg-[#1E1702] rounded-t-xl border border-border border-b-0">
                                            <div className="flex gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                            </div>
                                            <span className="text-[11px] text-white/40 font-mono ml-1">HTML</span>
                                            {codeInput.trim() && (
                                                <button
                                                    onClick={() => setCodeInput("")}
                                                    className="ml-auto text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                                                >
                                                    <IconX size={13} />
                                                </button>
                                            )}
                                        </div>
                                        <textarea
                                            id="html-code-input"
                                            value={codeInput}
                                            onChange={(e) => { setCodeInput(e.target.value); setError(null); }}
                                            placeholder={"<html>\n  <body>\n    <h1>Hello, World!</h1>\n    <p>This will become a PDF!</p>\n  </body>\n</html>"}
                                            className="w-full h-56 p-4 border border-border rounded-b-xl bg-[#1a1a1a] text-green-400 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316] placeholder:text-white/20"
                                            spellCheck={false}
                                        />
                                    </div>

                                    <button
                                        onClick={handleCodePreview}
                                        disabled={!codeInput.trim() || isGeneratingPreview}
                                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white text-sm transition-all shadow-md ${!codeInput.trim()
                                            ? "bg-[#F97316]/30 cursor-not-allowed"
                                            : isGeneratingPreview
                                                ? "bg-[#F97316] opacity-60 cursor-wait"
                                                : "bg-[#F97316] hover:bg-[#c2410c] cursor-pointer"
                                            }`}
                                    >
                                        {isGeneratingPreview ? (
                                            <IconLoader2 size={16} className="animate-spin" />
                                        ) : (
                                            <IconEye size={16} />
                                        )}
                                        {isGeneratingPreview ? "Processing..." : "Preview HTML"}
                                        {!isGeneratingPreview && <IconChevronRight size={15} />}
                                    </button>

                                    {/* Loading hint */}
                                    {isGeneratingPreview && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700 animate-pulse">
                                            <IconLoader2 size={13} className="animate-spin shrink-0" />
                                            <span>Generating your PDF preview, this may take a few moments. Don&apos;t close this tab.</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Shared Error ── */}
                            {error && (
                                <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                                    <IconAlertCircle size={16} className="shrink-0" />
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </ToolLayout>
    );
}

