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
} from "@tabler/icons-react";
import { htmlToPdf } from "@/lib/pdf-utils";
import { FileUpload } from "@/components/ui/file-upload";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ──────────────────────────────────────────────────────────────────
type Tab = "url" | "file" | "code";
type Stage = "input" | "preview" | "success";

// ─── Constants & Custom Select ───────────────────────────────────────────────
const SCREEN_SIZES = [
    { label: "Your screen (1536px)", value: "1536" },
    { label: "Desktop HD (1920px)", value: "1920" },
    { label: "Desktop (1440px)", value: "1440" },
    { label: "Tablet (768px)", value: "768" },
    { label: "Mobile (320px)", value: "320" },
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
                                className={`w-full text-left px-3 py-2.5 text-sm transition-colors cursor-pointer ${value === opt.value
                                    ? "bg-[#F97316]/10 text-[#F97316] font-semibold"
                                    : "text-brand-dark hover:bg-slate-50"
                                    }`}
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


// ─── Tab Button ─────────────────────────────────────────────────────────────
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

// ─── Preview Panel ───────────────────────────────────────────────────────────
function HtmlPreview({ html, title, screenSize }: { html: string; title: string; screenSize: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const w = parseInt(screenSize) || 1536;

    return (
        <div className="flex flex-col gap-3 flex-1 h-[400px] lg:h-auto min-h-[400px]">
            {/* Note: The preview container scales out visually to present the width while fitting on screen */}
            <div className="w-full bg-[#f1f1f1] overflow-auto p-4 border border-border flex items-start justify-center flex-1 inset-shadow-sm rounded-xl">
                <div
                    className="bg-white shadow-xl border border-slate-200 transition-all duration-300 origin-top shrink-0 relative"
                    style={{
                        width: `${w}px`,
                        height: "fit-content",
                        minHeight: "100%",
                        // Simple CSS scale to fit max 100% of container width could be applied here if needed
                        // For now giving it exact simulated width pixels.
                    }}
                >
                    {/* Overlay to block iframe pointer events while scaling/interacting might be useful, but native works */}
                    <iframe
                        ref={iframeRef}
                        srcDoc={html}
                        title="HTML Preview"
                        sandbox="allow-same-origin"
                        className="w-full h-[800px] lg:h-full border-none bg-white min-h-[400px]"
                    />
                </div>
            </div>
            <p className="text-xs text-brand-sage text-center bg-gray-50 py-1.5 rounded-lg border border-border">
                Simulated screen width: <strong className="text-brand-dark">{w}px</strong>. Scripts are disabled for security.
            </p>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
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
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Options Sidebar state
    const [screenSize, setScreenSize] = useState<string>("1536");
    const [pageSize, setPageSize] = useState<string>("a4");
    const [oneLongPage, setOneLongPage] = useState(false);
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
    const [margin, setMargin] = useState<string>("none");
    const [hideCookie, setHideCookie] = useState(true);
    const [blockAd, setBlockAd] = useState(false);

    // Tracking if options changed to highlight button
    const [settingsChanged, setSettingsChanged] = useState(false);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const resetAll = () => {
        setStage("input");
        setPreviewHtml("");
        setPreviewTitle("");
        setError(null);
        setUrlInput("");
        setHtmlFiles([]);
        setCodeInput("");
        setSettingsChanged(false);
    };

    // ── URL: Fetch & Preview ─────────────────────────────────────────────────
    const handleFetchUrl = async () => {
        if (!urlInput.trim()) return;
        setIsFetchingUrl(true);
        setError(null);
        try {
            const res = await fetch("/api/fetch-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: urlInput.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch URL.");
            setPreviewHtml(data.html);
            setPreviewTitle(data.title || urlInput.trim());
            setStage("preview");
            setSettingsChanged(false);
        } catch (err: any) {
            setError(err.message || "Failed to fetch URL.");
        } finally {
            setIsFetchingUrl(false);
        }
    };

    // ── File: Read & Preview ─────────────────────────────────────────────────
    const handleFileRead = useCallback((file: File) => {
        if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
            setError("Please upload an HTML file (.html or .htm).");
            return;
        }
        setError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setPreviewHtml(text);
            setPreviewTitle(file.name.replace(/\.(html|htm)$/i, ""));
            setStage("preview");
            setSettingsChanged(false);
        };
        reader.readAsText(file);
    }, []);

    // ── Code: Preview ────────────────────────────────────────────────────────
    const handleCodePreview = () => {
        if (!codeInput.trim()) return;
        setError(null);
        setPreviewHtml(codeInput);
        setPreviewTitle("custom-html");
        setStage("preview");
        setSettingsChanged(false);
    };

    // ── Convert to PDF ───────────────────────────────────────────────────────
    const handleConvert = async () => {
        if (!previewHtml.trim()) return;
        setIsConverting(true);
        setError(null);
        setSettingsChanged(false); // Reset highlight
        try {
            await htmlToPdf(previewHtml, previewTitle || "document");
            setStage("success");
        } catch (err: any) {
            setError(err.message || "Failed to convert HTML to PDF.");
        } finally {
            setIsConverting(false);
        }
    };

    // ── Download HTML ────────────────────────────────────────────────────────
    const handleDownloadHtml = () => {
        const blob = new Blob([previewHtml], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${previewTitle || "document"}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Helper to log changes to the form
    const triggerSettingChange = () => setSettingsChanged(true);

    // ─────────────────────────────────────────────────────────────────────────
    // Render: Preview and Success full page structure
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
                            <h2 className="text-xl font-bold text-brand-dark">PDF Generated!</h2>
                            <p className="text-brand-sage mt-2 text-sm">Your PDF is downloading to your device.</p>
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

                    {/* ── PREVIEW STATE (Two column layout) ── */}
                    {stage === "preview" && (
                        <div className="flex flex-col lg:flex-row gap-6">

                            {/* Left: Preview Html */}
                            <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-border p-5 flex flex-col gap-5">
                                {/* Header */}
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                                        <span className="text-sm font-semibold text-brand-dark truncate max-w-[200px] md:max-w-xs">
                                            {previewTitle}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleDownloadHtml}
                                            className="flex items-center gap-1.5 text-xs text-brand-sage hover:text-brand-dark transition-colors cursor-pointer px-2"
                                        >
                                            <IconDownload size={14} />
                                            <span className="hidden sm:inline">Download HTML</span>
                                        </button>
                                        <button
                                            onClick={resetAll}
                                            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer px-2"
                                        >
                                            <IconRefresh size={14} />
                                            Restart
                                        </button>
                                    </div>
                                </div>

                                {/* Preview Component */}
                                <HtmlPreview html={previewHtml} title={previewTitle} screenSize={screenSize} />
                            </div>

                            {/* Right: Sidebar Options */}
                            <div className="w-full lg:w-72 xl:w-80 shrink-0">
                                <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-5 sticky top-24">
                                    <h2 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                                        <IconFileTypePdf size={18} className="text-[#F97316]" />
                                        Convert Options
                                    </h2>

                                    {/* If from URL, allow updating the URL inline */}
                                    {activeTab === "url" && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-brand-sage uppercase tracking-widest mb-0.5">Website URL</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={urlInput}
                                                    onChange={(e) => { setUrlInput(e.target.value); triggerSettingChange(); }}
                                                    onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316]"
                                                />
                                                <button
                                                    onClick={handleFetchUrl}
                                                    disabled={isFetchingUrl || !urlInput.trim()}
                                                    className="px-3 py-2 bg-[#F97316] text-white rounded-xl hover:bg-[#c2410c] transition-colors flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                                                    title="Fetch URL again"
                                                >
                                                    <IconRefresh size={16} className={isFetchingUrl ? "animate-spin" : ""} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Screen Size */}
                                    <CustomSelect
                                        label="Screen Size"
                                        options={SCREEN_SIZES}
                                        value={screenSize}
                                        onChange={(v) => { setScreenSize(v); triggerSettingChange(); }}
                                    />

                                    <div className="h-px w-full bg-slate-100" />

                                    {/* Page Size */}
                                    <div className="flex flex-col gap-3">
                                        <CustomSelect
                                            label="Page Size"
                                            options={PAGE_SIZES}
                                            value={pageSize}
                                            onChange={(v) => { setPageSize(v); triggerSettingChange(); }}
                                        />
                                        <label className="flex items-center gap-2 mt-1 cursor-pointer">
                                            <div
                                                className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${oneLongPage ? "bg-green-500 border-green-500" : "bg-white border-slate-300"}`}
                                                onClick={() => { setOneLongPage(!oneLongPage); triggerSettingChange(); }}
                                            >
                                                {oneLongPage && <IconCheck size={14} className="text-white" stroke={3} />}
                                            </div>
                                            <span className="text-sm font-medium text-brand-dark select-none min-w-0" onClick={() => { setOneLongPage(!oneLongPage); triggerSettingChange(); }}>
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
                                                    onClick={() => { setOrientation(o); triggerSettingChange(); }}
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
                                                    onClick={() => { setMargin(m.value); triggerSettingChange(); }}
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

                                    {/* Extra Options (Cookie/AdBlock) */}
                                    <div className="flex flex-col gap-3">
                                        <label className="flex flex-row items-center gap-3 cursor-pointer">
                                            <div
                                                className={`relative rounded-full transition-colors duration-200 border-2 mt-0.5 ${hideCookie ? "bg-[#F97316] border-[#F97316]" : "bg-slate-200 border-slate-200"}`}
                                                onClick={() => { setHideCookie(!hideCookie); triggerSettingChange(); }}
                                                style={{ height: "22px", width: "40px", flexShrink: 0 }}
                                            >
                                                <span className={`absolute top-[1px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${hideCookie ? "translate-x-4" : "translate-x-0.5"}`} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-brand-dark">Hide cookie dialog</span>
                                            </div>
                                        </label>

                                        <label className="flex flex-row items-center gap-3 cursor-pointer">
                                            <div
                                                className={`relative rounded-full transition-colors duration-200 border-2 mt-0.5 ${blockAd ? "bg-[#F97316] border-[#F97316]" : "bg-slate-200 border-slate-200"}`}
                                                onClick={() => { setBlockAd(!blockAd); triggerSettingChange(); }}
                                                style={{ height: "22px", width: "40px", flexShrink: 0 }}
                                            >
                                                <span className={`absolute top-[1px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${blockAd ? "translate-x-4" : "translate-x-0.5"}`} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-brand-dark">Try to block ads</span>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Error */}
                                    {error && (
                                        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
                                            <span className="w-1.5 h-1.5 mt-1 rounded-full bg-red-500 shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    {/* Convert Button */}
                                    <button
                                        onClick={handleConvert}
                                        disabled={isConverting}
                                        className={`w-full mt-2 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md text-sm cursor-pointer ${isConverting
                                            ? "bg-[#F97316] opacity-60 cursor-wait shadow-none"
                                            : "bg-[#F97316] hover:bg-[#c2410c]"
                                            }`}
                                    >
                                        {isConverting ? (
                                            <>
                                                <IconLoader2 size={18} className="animate-spin" />
                                                Generating PDF…
                                            </>
                                        ) : (
                                            <>
                                                <IconFileTypePdf size={18} />
                                                Convert to PDF
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}
                </main>

                {/* Floating "Click to Preview" Button */}
                <AnimatePresence>
                    {stage === "preview" && settingsChanged && (
                        <motion.button
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                // If url changed, we fetch again. Otherwise just update preview.
                                if (activeTab === "url" && urlInput.trim()) {
                                    handleFetchUrl();
                                } else {
                                    setSettingsChanged(false);
                                }
                            }}
                            className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-6 py-4 bg-[#1E1E1E] hover:bg-black text-white rounded-full font-bold shadow-2xl shadow-black/40 transition-colors cursor-pointer"
                        >
                            {isFetchingUrl ? (
                                <IconLoader2 size={20} className="animate-spin" />
                            ) : (
                                <IconRefresh size={20} />
                            )}
                            Click to Preview
                        </motion.button>
                    )}
                </AnimatePresence>

            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render: Input
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <ToolLayout
            title="HTML to PDF"
            description="Convert any webpage URL, HTML file, or raw HTML code into a professional PDF document instantly."
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
                                            We'll fetch the page's HTML on our server to avoid CORS restrictions.
                                        </p>
                                    </div>

                                    {/* URL input row */}
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

                                    {/* Info box */}
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
                                            Accepts .html and .htm files. The file is processed locally in your browser.
                                        </p>
                                    </div>

                                    {/* Drop zone */}
                                    <FileUpload
                                        accept={{ "text/html": [".html", ".htm"] }}
                                        multiple={false}
                                        files={htmlFiles}
                                        setFiles={setHtmlFiles}
                                    />

                                    {htmlFiles.length > 0 && (
                                        <button
                                            onClick={() => handleFileRead(htmlFiles[0])}
                                            className="flex items-center gap-2 w-full justify-center py-3 rounded-xl bg-[#F97316] text-white font-semibold text-sm hover:bg-[#c2410c] transition-all cursor-pointer shadow-md"
                                        >
                                            <IconEye size={16} />
                                            Preview HTML
                                            <IconChevronRight size={15} />
                                        </button>
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
                                        {/* Code editor header */}
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
                                        disabled={!codeInput.trim()}
                                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white text-sm transition-all shadow-md ${!codeInput.trim()
                                            ? "bg-[#F97316]/30 cursor-not-allowed"
                                            : "bg-[#F97316] hover:bg-[#c2410c] cursor-pointer"
                                            }`}
                                    >
                                        <IconEye size={16} />
                                        Preview HTML
                                        <IconChevronRight size={15} />
                                    </button>
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
