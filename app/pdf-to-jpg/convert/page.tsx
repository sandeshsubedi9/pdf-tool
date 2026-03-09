"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "motion/react";
import {
    IconPhoto,
    IconDownload,
    IconLoader2,
    IconArrowLeft,
    IconCheck,
    IconSelectAll,
    IconX,
    IconPackage,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { downloadZip, downloadDataUrl } from "@/lib/pdf-utils";
import FileStore from "@/lib/file-store";

/* ─── Types ─── */
interface PageItem {
    pageNum: number;
    dataUrl: string;
    name: string;
}

/* ─── Thumbnail Card ─── */
function PageCard({
    item,
    selected,
    onToggle,
    onDownload,
}: {
    item: PageItem;
    selected: boolean;
    onToggle: () => void;
    onDownload: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`relative group rounded-2xl overflow-hidden border-2 transition-all duration-200 bg-white shadow-sm cursor-pointer select-none
                ${selected
                    ? "border-[#EAB308] shadow-yellow-200 shadow-md"
                    : "border-slate-100 hover:border-[#EAB308]/50"
                }`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onToggle}
        >
            {/* Thumbnail image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={item.dataUrl}
                alt={`Page ${item.pageNum}`}
                className="w-full object-contain bg-slate-50"
                style={{ aspectRatio: "3/4" }}
                draggable={false}
            />

            {/* Hover overlay */}
            <AnimatePresence>
                {(hovered || selected) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 bg-black/20 flex-col items-center justify-center gap-3 hidden md:flex"
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDownload();
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-brand-dark text-sm font-semibold shadow hover:bg-yellow-50 hover:text-yellow-700 transition-colors cursor-pointer"
                        >
                            <IconDownload size={16} />
                            Save Page
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Actions: Only shows on sm screens. Desktop relies on hover overlay */}
            <div className="md:hidden flex flex-col items-stretch p-2 border-t border-slate-100 bg-white gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDownload();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 text-yellow-700 text-sm font-semibold hover:bg-yellow-100 transition-colors cursor-pointer"
                >
                    <IconDownload size={16} />
                    Save Page
                </button>
            </div>

            {/* Selection circle - Always show on sm. Hover behavior purely for lg */}
            <button
                className={`absolute top-2.5 left-2.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 shadow z-10 cursor-pointer
                    ${selected
                        ? "bg-[#EAB308] border-[#EAB308]"
                        : "bg-white/90 border-slate-300 hover:border-[#EAB308] opacity-100 md:opacity-0 group-hover:opacity-100"
                    }`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                title={selected ? "Deselect" : "Select"}
            >
                {selected && <IconCheck size={12} stroke={3} className="text-white" />}
            </button>

            {/* Page label */}
            <div className="px-3 py-2 border-t border-slate-100 bg-white">
                <p className="text-xs font-semibold text-brand-sage text-center">Page {item.pageNum}</p>
            </div>
        </motion.div>
    );
}

/* ─── Main Page ─── */
export default function ConvertPagesToJpgPage() {
    const router = useRouter();
    const [pages, setPages] = useState<PageItem[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState("document");

    /* Load & render pages */
    useEffect(() => {
        const file = FileStore.getFile("current_pdf");

        if (!file) {
            setError("No PDF found. Please go back and upload a file.");
            setLoading(false);
            return;
        }

        setFileName(file.name.replace(/\.pdf$/i, ""));

        const toastId = toast.loading("Rendering PDF pages…");

        const formData = new FormData();
        formData.append("file", file, file.name);

        fetch("/api/pdf-pages-to-jpg?dpi=150", {
            method: "POST",
            body: formData,
        })
            .then(async (res) => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: "Unknown error" }));
                    throw new Error(err.error || "Rendering failed");
                }
                return res.json();
            })
            .then((data: { pages: PageItem[]; total: number }) => {
                setPages(data.pages);
                toast.success(`Loaded ${data.total} page${data.total !== 1 ? "s" : ""}`, { id: toastId });
            })
            .catch((err) => {
                console.error(err);
                setError(err.message || "Failed to render pages.");
                toast.error(err.message || "Failed to render pages.", { id: toastId });
            })
            .finally(() => setLoading(false));
    }, []);

    const toggleSelect = useCallback((pageNum: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(pageNum)) next.delete(pageNum);
            else next.add(pageNum);
            return next;
        });
    }, []);

    const selectAll = () => setSelected(new Set(pages.map((p) => p.pageNum)));
    const clearAll = () => setSelected(new Set());
    const allSelected = pages.length > 0 && selected.size === pages.length;

    const downloadPage = (item: PageItem) => {
        downloadDataUrl(item.dataUrl, item.name);
        toast.success(`Downloaded Page ${item.pageNum}`);
    };

    const downloadSelected = async () => {
        if (selected.size === 0) {
            toast.error("Please select at least one page.");
            return;
        }
        const items = pages.filter((p) => selected.has(p.pageNum));
        if (items.length === 1) {
            downloadPage(items[0]);
            return;
        }
        const toastId = toast.loading(`Packaging ${items.length} pages…`);
        setIsDownloading(true);
        try {
            await downloadZip(
                items.map((p) => ({ data: p.dataUrl, name: p.name })),
                `${fileName}-selected-pages.zip`
            );
            toast.success(`Downloaded ${items.length} pages`, { id: toastId });
        } catch (e: any) {
            toast.error(e.message || "Download failed", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadAll = async () => {
        if (pages.length === 0) return;
        if (pages.length === 1) {
            downloadPage(pages[0]);
            return;
        }
        const toastId = toast.loading(`Packaging all ${pages.length} pages…`);
        setIsDownloading(true);
        try {
            await downloadZip(
                pages.map((p) => ({ data: p.dataUrl, name: p.name })),
                `${fileName}-all-pages.zip`
            );
            toast.success("All pages downloaded!", { id: toastId });
        } catch (e: any) {
            toast.error(e.message || "Download failed", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--brand-white)" }}>
            <Navbar />

            {/* Background */}
            <div aria-hidden className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, #8C886B 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    opacity: 0.05,
                }}
            />

            <main className="flex-1 max-w-7xl mx-auto px-5 md:px-8 w-full pt-24 pb-6 relative z-10 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/pdf-to-jpg")}
                            className="flex items-center gap-1.5 text-sm font-medium text-brand-sage hover:text-brand-dark hover:bg-slate-100 px-3 py-1.5 rounded-lg -ml-3 transition-colors cursor-pointer"
                        >
                            <IconArrowLeft size={16} />
                            Back
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl text-white" style={{ background: "#EAB308" }}>
                                <IconPhoto size={20} stroke={1.5} />
                            </span>
                            <div>
                                <h1 className="text-xl font-bold text-brand-dark leading-tight">Convert Pages to JPG</h1>
                                <p className="text-xs text-brand-sage">{fileName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action bar */}
                    {!loading && !error && pages.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={allSelected ? clearAll : selectAll}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-brand-dark hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                            >
                                {allSelected ? <IconX size={15} /> : <IconSelectAll size={15} />}
                                {allSelected ? "Deselect All" : "Select All"}
                            </button>

                            {selected.size > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={downloadSelected}
                                    disabled={isDownloading}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all shadow-md active:scale-[0.98] ${isDownloading
                                        ? "bg-[#EAB308] opacity-50 cursor-wait"
                                        : "bg-[#EAB308] hover:bg-[#ca9a04] cursor-pointer"
                                        }`}
                                >
                                    <IconDownload size={15} />
                                    Download Selected ({selected.size})
                                </motion.button>
                            )}

                            <button
                                onClick={downloadAll}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-brand-dark hover:bg-slate-50 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                            >
                                <IconPackage size={15} />
                                Download All
                            </button>
                        </div>
                    )}
                </div>
                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar pb-10">
                    {/* States */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <IconLoader2 size={40} className="animate-spin text-[#EAB308]" />
                            <p className="text-brand-sage font-medium">Rendering your PDF pages…</p>
                            <p className="text-sm text-brand-sage opacity-70">This may take a moment for large files</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 text-3xl">✗</div>
                            <p className="font-semibold text-brand-dark">{error}</p>
                            <button
                                onClick={() => router.push("/pdf-to-jpg")}
                                className="mt-2 px-8 py-3 rounded-xl bg-white text-black font-medium hover:bg-slate-50 transition-all cursor-pointer shadow-md"
                            >
                                Upload Another PDF
                            </button>
                        </div>
                    )}

                    {!loading && !error && pages.length > 0 && (
                        <>
                            {/* Selection info bar */}
                            {selected.size > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm font-medium text-yellow-800"
                                >
                                    <IconCheck size={16} className="text-yellow-600" />
                                    {selected.size} page{selected.size !== 1 ? "s" : ""} selected
                                    <button
                                        onClick={clearAll}
                                        className="ml-auto text-yellow-600 hover:text-yellow-800 underline text-xs cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                </motion.div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {pages.map((item) => (
                                    <PageCard
                                        key={item.pageNum}
                                        item={item}
                                        selected={selected.has(item.pageNum)}
                                        onToggle={() => toggleSelect(item.pageNum)}
                                        onDownload={() => downloadPage(item)}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>

        </div>
    );
}
